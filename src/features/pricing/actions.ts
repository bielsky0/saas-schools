"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { enqueueJob } from "@/features/jobs/enqueue";
import { requireOrgPermission } from "@/features/organizations/context";
import { client, clientPriceOverride, clientSubscription, groupType } from "@/lib/db/schema";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { deactivatePriceOverrideSchema, grantPriceOverrideSchema } from "./schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

class UnknownTargetError extends Error {
  constructor(readonly which: "client" | "groupType" | "override") {
    super(which);
  }
}

/**
 * Grant a client-specific price override (EPIK 33, US-33.1).
 *
 * Two guards: `client_price_override.manage` answers who may grant; the
 * required `reason` answers why. Same pattern as `credits.manual_grant`.
 *
 * If an active override already exists for this (client, group_type) pair,
 * it is automatically deactivated before the new one is inserted (same
 * transaction). This prevents two active overrides from coexisting for
 * the same scope — the partial unique index with NULLS NOT DISTINCT is the
 * database-level guarantee, and this application check provides a cleaner
 * error path and UX.
 *
 * Lock order: SELECT ... FOR UPDATE on the client_price_override rows for
 * this (org, client, group_type) pair, taken BEFORE the read, serialises
 * concurrent grants for the same scope (Constraint 10).
 */
export async function grantPriceOverrideAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("client_price_override.manage");
  const [t, tv] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("pricing.validation"),
  ]);

  const parsed = grantPriceOverrideSchema(tv).safeParse({
    clientId: str(formData.get("clientId")),
    groupTypeId: str(formData.get("groupTypeId")) || null,
    overrideType: str(formData.get("overrideType")),
    value: str(formData.get("value")),
    validFrom: str(formData.get("validFrom")),
    validUntil: str(formData.get("validUntil")) || null,
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

      if (parsed.data.groupTypeId) {
        const gt = await findGroupType(tx, ctx.org.id, parsed.data.groupTypeId);
        if (!gt) throw new UnknownTargetError("groupType");
      }

      // Lock: serialise concurrent grants for the same (client, group_type)
      // Taken BEFORE the read, so two simultaneous grant actions for the same
      // scope block on the lock rather than both seeing "no active override"
      // and both inserting (Constraint 10).
      await tx
        .select({ id: clientPriceOverride.id })
        .from(clientPriceOverride)
        .where(
          and(
            eq(clientPriceOverride.organizationId, ctx.org.id),
            eq(clientPriceOverride.clientId, parsed.data.clientId),
            parsed.data.groupTypeId
              ? eq(clientPriceOverride.groupTypeId, parsed.data.groupTypeId)
              : isNull(clientPriceOverride.groupTypeId),
          ),
        )
        .for("update");

      // Auto-deactivate existing active override for this scope
      await tx
        .update(clientPriceOverride)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(clientPriceOverride.organizationId, ctx.org.id),
            eq(clientPriceOverride.clientId, parsed.data.clientId),
            parsed.data.groupTypeId
              ? eq(clientPriceOverride.groupTypeId, parsed.data.groupTypeId)
              : isNull(clientPriceOverride.groupTypeId),
            eq(clientPriceOverride.isActive, true),
          ),
        );

      // Insert the new override
      const [row] = await tx
        .insert(clientPriceOverride)
        .values({
          organizationId: ctx.org.id,
          clientId: parsed.data.clientId,
          groupTypeId: parsed.data.groupTypeId ?? null,
          overrideType: parsed.data.overrideType,
          value: parsed.data.value,
          validFrom: parsed.data.validFrom,
          validUntil: parsed.data.validUntil ?? null,
          reason: parsed.data.reason,
          grantedByUserId: ctx.session.user.id,
          isActive: true,
        })
        .returning({ id: clientPriceOverride.id });
      if (!row) throw new Error("grantPriceOverride: insert returned no row");

      await recordAudit(tx, {
        action: "client_price_override.grant",
        actor,
        organizationId: ctx.org.id,
        targetType: "client",
        targetId: parent.id,
        targetLabel: parent.email,
        metadata: {
          overrideId: row.id,
          overrideType: parsed.data.overrideType,
          value: parsed.data.value,
          groupTypeId: parsed.data.groupTypeId ?? null,
          validFrom: parsed.data.validFrom,
          validUntil: parsed.data.validUntil ?? null,
          reason: parsed.data.reason,
        },
      });

      // Enqueue subscription price sync if this client has active subscriptions
      const activeSubs = await tx
        .select({ id: clientSubscription.id })
        .from(clientSubscription)
        .where(
          and(
            eq(clientSubscription.organizationId, ctx.org.id),
            eq(clientSubscription.clientId, parsed.data.clientId),
            eq(clientSubscription.status, "active"),
          ),
        )
        .limit(1);

      if (activeSubs.length > 0) {
        await enqueueJob(tx, "pricing.sync_subscription_price", {
          organizationId: ctx.org.id,
          clientId: parsed.data.clientId,
        });
      }
    });
  } catch (error) {
    if (error instanceof UnknownTargetError) {
      if (error.which === "client") return { error: t("errors.clientNotFound") };
      if (error.which === "groupType") return { error: t("errors.groupTypeNotFound") };
      return { error: t("errors.overrideNotFound") };
    }
    throw error;
  }

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  return { success: t("granted") };
}

/**
 * Deactivate a price override (US-33.6).
 *
 * Physically sets `is_active = false`. The row stays for audit history.
 */
export async function deactivatePriceOverrideAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("client_price_override.manage");
  const [t, tv] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("pricing.validation"),
  ]);

  const parsed = deactivatePriceOverrideSchema(tv).safeParse({
    overrideId: str(formData.get("overrideId")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const [existing] = await tx
        .select({ id: clientPriceOverride.id, clientId: clientPriceOverride.clientId })
        .from(clientPriceOverride)
        .where(
          and(
            eq(clientPriceOverride.id, parsed.data.overrideId),
            eq(clientPriceOverride.organizationId, ctx.org.id),
            eq(clientPriceOverride.isActive, true),
          ),
        )
        .limit(1);
      if (!existing) throw new UnknownTargetError("override");

      await tx
        .update(clientPriceOverride)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(clientPriceOverride.id, parsed.data.overrideId));

      await recordAudit(tx, {
        action: "client_price_override.revoke",
        actor,
        organizationId: ctx.org.id,
        targetType: "client",
        targetId: existing.clientId,
        targetLabel: existing.id,
        metadata: {
          overrideId: existing.id,
        },
      });

      // Enqueue subscription price sync
      const activeSubs = await tx
        .select({ id: clientSubscription.id })
        .from(clientSubscription)
        .where(
          and(
            eq(clientSubscription.organizationId, ctx.org.id),
            eq(clientSubscription.clientId, existing.clientId),
            eq(clientSubscription.status, "active"),
          ),
        )
        .limit(1);

      if (activeSubs.length > 0) {
        await enqueueJob(tx, "pricing.sync_subscription_price", {
          organizationId: ctx.org.id,
          clientId: existing.clientId,
        });
      }
    });
  } catch (error) {
    if (error instanceof UnknownTargetError) {
      return { error: t("errors.overrideNotFound") };
    }
    throw error;
  }

  return { success: t("deactivated") };
}

async function findClient(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select({ id: client.id, email: client.email })
    .from(client)
    .where(and(eq(client.id, id), eq(client.organizationId, organizationId), isNull(client.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function findGroupType(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select({ id: groupType.id })
    .from(groupType)
    .where(and(eq(groupType.id, id), eq(groupType.organizationId, organizationId), isNull(groupType.deletedAt)))
    .limit(1);
  return row ?? null;
}
