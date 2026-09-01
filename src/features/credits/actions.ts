"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { athlete, client, creditType, productTemplate } from "@/lib/db/schema";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { issueCredits } from "./issue";
import { grantCreditsSchema, productTemplateSchema } from "./schema";
import { CreditTypeNotFoundError, deactivateCreditType } from "./deactivate";
import {
  SQLSTATE_UNIQUE_VIOLATION,
  sqlStateOf,
} from "@/lib/db/sql-error";

/**
 * Credit server actions (langlion §2.4, EPIK 7).
 *
 * One action in F4, because one is what this phase can honestly authorise. The
 * other five credit sources are consequences of something else happening — a
 * webhook, a cash confirmation, a cancellation — and belong to the phase that
 * owns that event. They call `issueCredits` directly, from inside the transaction
 * that justified them.
 *
 * Conventions inherited from the boilerplate's org actions and not restated:
 * `requireOrgPermission` first (§4.2), `resolveActor` awaited BEFORE the
 * transaction opens (deadlock — see `features/admin/audit.ts`), audit row inside
 * the same transaction as the write.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Thrown inside the transaction to abort it and surface a field error. */
class UnknownTargetError extends Error {
  constructor(readonly which: "client" | "creditType" | "athlete") {
    super(which);
  }
}

/**
 * Grant credits to a parent by hand (US-7.3).
 *
 * TWO GUARDS, ANSWERING DIFFERENT QUESTIONS, and neither substitutes for the
 * other. `credits.manual_grant` answers who may create settlement value out of
 * nothing; the required `reason` (enforced in `grantCreditsSchema`) answers why
 * this particular grant happened. US-7.3/AC1 makes rejecting an unexplained grant
 * an acceptance criterion, and AC2 wants who/whom/how many/which type/why/when
 * recoverable afterwards — which is the audit row at the bottom.
 *
 * The three ownership checks below are NOT the security boundary: the composite
 * foreign keys make a cross-tenant client, credit type or athlete structurally
 * impossible to insert, and RLS makes them invisible to read. They exist to turn
 * a 23503 stack trace into a message an admin can act on.
 */
export async function grantCreditsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgPermission("credits.manual_grant");
  const [t, tv] = await Promise.all([
    getTranslations("credits"),
    getTranslations("credits.validation"),
  ]);

  const parsed = grantCreditsSchema(tv).safeParse({
    clientId: str(formData.get("clientId")),
    creditTypeId: str(formData.get("creditTypeId")),
    athleteId: str(formData.get("athleteId")) || undefined,
    quantity: str(formData.get("quantity")),
    reason: str(formData.get("reason")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const parent = await findClient(tx, ctx.org.id, parsed.data.clientId);
      if (!parent) throw new UnknownTargetError("client");

      const type = await findCreditType(tx, ctx.org.id, parsed.data.creditTypeId);
      if (!type) throw new UnknownTargetError("creditType");

      // A reserved grant must name a child OF THIS PARENT. Naming another
      // client's child would otherwise create a credit nobody can ever spend:
      // consumption matches on parent and athlete together.
      if (parsed.data.athleteId) {
        const child = await findAthlete(tx, ctx.org.id, parsed.data.athleteId);
        if (!child || child.parentClientId !== parent.id) {
          throw new UnknownTargetError("athlete");
        }
      }

      const issued = await issueCredits(tx, {
        organizationId: ctx.org.id,
        clientId: parent.id,
        creditTypeId: type.id,
        athleteId: parsed.data.athleteId ?? null,
        quantity: parsed.data.quantity,
        source: "manual_admin_grant",
        // US-1.2/AC3 — the academy's zone decides when these lapse, never the
        // server's. `ctx.org` already carries it; no second lookup.
        timeZone: ctx.org.timezone,
        grantedByUserId: ctx.session.user.id,
        reason: parsed.data.reason,
      });

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "credit.grant",
        targetType: "client",
        targetId: parent.id,
        targetLabel: parent.email,
        // US-7.3/AC2 in one object: who is the actor, whom is the target, and the
        // rest is here. `reason` included deliberately — the ledger is where an
        // unexplained grant would be discovered, so the explanation belongs in it
        // rather than only on the credit rows.
        metadata: {
          creditTypeId: type.id,
          creditTypeName: type.name,
          quantity: parsed.data.quantity,
          athleteId: parsed.data.athleteId ?? null,
          reason: parsed.data.reason,
          validUntil: issued[0]?.validUntil.toISOString() ?? null,
        },
      });
    });
  } catch (error) {
    if (error instanceof UnknownTargetError) {
      if (error.which === "client") return { error: t("errors.clientNotFound") };
      if (error.which === "creditType") return { error: t("errors.creditTypeNotFound") };
      return { error: t("errors.athleteNotFound") };
    }
    throw error;
  }

  return { success: t("granted") };
}

/**
 * Deactivate a credit type (langlion EPIK 20/AC3, Faza 8).
 *
 * Existing credits continue to work until natural expiry. New purchases are
 * blocked by the existing `isNull(deletedAt)` filter in `listCreditTypes()`.
 *
 * GATING: celowo używamy `group_types.deactivate` zamiast dedykowanego
 * permission — relacja 1:1 credit_type ↔ group_type. Nie dodawać osobnego
 * permission "na wyrost" przy okazji kolejnych faz bez ponownego review
 * tej decyzji.
 */
export async function deactivateCreditTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const creditTypeId = str(formData.get("creditTypeId"));
  const ctx = await requireOrgPermission("group_types.deactivate");
  const t = await getTranslations("credits");

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, (tx) =>
      deactivateCreditType(tx, {
        organizationId: ctx.org.id,
        creditTypeId,
        actor,
      }),
    );

    revalidatePath(`/dashboard/credits`);
    return { success: t("deactivated") };
  } catch (e) {
    if (e instanceof CreditTypeNotFoundError) return { error: t("errors.creditTypeNotFound") };
    throw e;
  }
}

async function findClient(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select({ id: client.id, email: client.email })
    .from(client)
    .where(
      and(eq(client.id, id), eq(client.organizationId, organizationId), isNull(client.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

async function findCreditType(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select({ id: creditType.id, name: creditType.name })
    .from(creditType)
    .where(
      and(
        eq(creditType.id, id),
        eq(creditType.organizationId, organizationId),
        // A retired credit type may still be spent from (US-20.1/AC3) but must
        // not be granted into: that would be issuing value in a currency the
        // academy has stopped selling.
        isNull(creditType.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function findAthlete(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select({ id: athlete.id, parentClientId: athlete.parentClientId })
    .from(athlete)
    .where(
      and(
        eq(athlete.id, id),
        eq(athlete.organizationId, organizationId),
        isNull(athlete.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Product Template CRUD (mvp-plan F4 — Cennik w kreatorze Group Type).
 *
 * Each template defines a package/subscription for a specific group type
 * (via creditType 1:1 relationship).
 */

async function getCreditTypeForGroupType(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
) {
  const [row] = await tx
    .select({ id: creditType.id })
    .from(creditType)
    .where(
      and(
        eq(creditType.organizationId, organizationId),
        eq(creditType.groupTypeId, groupTypeId),
        isNull(creditType.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createProductTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupTypeId = str(formData.get("groupTypeId"));
  const ctx = await requireOrgPermission("group_types.manage");
  const [t, tv] = await Promise.all([
    getTranslations("credits"),
    getTranslations("credits.validation"),
  ]);

  const parsed = productTemplateSchema(tv).safeParse({
    name: str(formData.get("name")),
    description: str(formData.get("description")) || undefined,
    price: str(formData.get("price")),
    creditQuantity: str(formData.get("creditQuantity")),
    billingType: str(formData.get("billingType")),
    interval: str(formData.get("interval")) || undefined,
    intervalCount: str(formData.get("intervalCount")) || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const creditTypeRow = await getCreditTypeForGroupType(tx, ctx.org.id, groupTypeId);
      if (!creditTypeRow) return { error: t("errors.creditTypeNotFound") };

      await tx.insert(productTemplate).values({
        organizationId: ctx.org.id,
        creditTypeId: creditTypeRow.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        creditQuantity: parsed.data.creditQuantity,
        billingType: parsed.data.billingType,
        interval: parsed.data.interval ?? null,
        intervalCount: parsed.data.intervalCount ?? null,
        isActive: parsed.data.isActive,
      });

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "product_template.create",
        targetType: "product_template",
        targetId: creditTypeRow.id,
        targetLabel: parsed.data.name,
      });
    });
  } catch (error) {
    if (sqlStateOf(error) === SQLSTATE_UNIQUE_VIOLATION) return { error: t("errors.nameTaken") };
    throw error;
  }

  revalidatePath(`/dashboard/group-types/${groupTypeId}`);
  return { success: (t as any)("productTemplateCreated") };
}

export async function updateProductTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const templateId = str(formData.get("templateId"));
  const groupTypeId = str(formData.get("groupTypeId"));
  const ctx = await requireOrgPermission("group_types.manage");
  const [t, tv] = await Promise.all([
    getTranslations("credits"),
    getTranslations("credits.validation"),
  ]);

  const parsed = productTemplateSchema(tv).safeParse({
    name: str(formData.get("name")),
    description: str(formData.get("description")) || undefined,
    price: str(formData.get("price")),
    creditQuantity: str(formData.get("creditQuantity")),
    billingType: str(formData.get("billingType")),
    interval: str(formData.get("interval")) || undefined,
    intervalCount: str(formData.get("intervalCount")) || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const creditTypeRow = await getCreditTypeForGroupType(tx, ctx.org.id, groupTypeId);
      if (!creditTypeRow) return { error: t("errors.creditTypeNotFound") };

      const [before] = await tx
        .select()
        .from(productTemplate)
        .where(
          and(
            eq(productTemplate.id, templateId),
            eq(productTemplate.organizationId, ctx.org.id),
            eq(productTemplate.creditTypeId, creditTypeRow.id),
          ),
        )
        .limit(1);
      if (!before) return { error: t("errors.notFound") };

      await tx
        .update(productTemplate)
        .set({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          price: parsed.data.price,
          creditQuantity: parsed.data.creditQuantity,
          billingType: parsed.data.billingType,
          interval: parsed.data.interval ?? null,
          intervalCount: parsed.data.intervalCount ?? null,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(productTemplate.id, templateId));

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "product_template.update",
        targetType: "product_template",
        targetId: templateId,
        targetLabel: parsed.data.name,
      });
    });
  } catch (error) {
    if (sqlStateOf(error) === SQLSTATE_UNIQUE_VIOLATION) return { error: t("errors.nameTaken") };
    throw error;
  }

  revalidatePath(`/dashboard/group-types/${groupTypeId}`);
  return { success: (t as any)("productTemplateUpdated") };
}

export async function deleteProductTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const templateId = str(formData.get("templateId"));
  const groupTypeId = str(formData.get("groupTypeId"));
  const ctx = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("credits");

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const creditTypeRow = await getCreditTypeForGroupType(tx, ctx.org.id, groupTypeId);
      if (!creditTypeRow) return { error: t("errors.creditTypeNotFound") };

      const [before] = await tx
        .select()
        .from(productTemplate)
        .where(
          and(
            eq(productTemplate.id, templateId),
            eq(productTemplate.organizationId, ctx.org.id),
            eq(productTemplate.creditTypeId, creditTypeRow.id),
          ),
        )
        .limit(1);
      if (!before) return { error: t("errors.notFound") };

      await tx.delete(productTemplate).where(eq(productTemplate.id, templateId));

      await recordAudit(tx, {
        actor,
        organizationId: ctx.org.id,
        action: "product_template.delete",
        targetType: "product_template",
        targetId: templateId,
        targetLabel: before.name,
      });
    });
  } catch (error) {
    throw error;
  }

  revalidatePath(`/dashboard/group-types/${groupTypeId}`);
  return { success: (t as any)("productTemplateDeleted") };
}
