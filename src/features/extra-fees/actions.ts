"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { assertConnectActive } from "@/features/billing/checkout";
import { startExtraFeeConnectCheckout } from "@/features/billing/connect-checkout";
import { resolveClientSession } from "@/features/client-auth/session";
import { requireOrgPermission } from "@/features/organizations/context";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

import {
  cancelExtraFee,
  createExtraFee,
  getExtraFee,
  listSessionBookings,
  lockAndConfirmCashExtraFee,
  markInvoiceIssued,
  markInvoiceRequested,
} from "./data";
import {
  bulkCreateExtraFeeSchema,
  cancelExtraFeeSchema,
  confirmCashExtraFeeSchema,
  createExtraFeeSchema,
  markExtraFeeInvoiceIssuedSchema,
  requestInvoiceExtraFeeSchema,
} from "./schema";

const log = createLogger("extra-fees:actions");

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

// ── Single create ─────────────────────────────────────────────────────────

export async function createExtraFeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("extra_fees.manage");
  const t = await getTranslations("extraFees");

  const parsed = createExtraFeeSchema.safeParse({
    clientId: str(formData.get("clientId")),
    athleteId: str(formData.get("athleteId")) || undefined,
    bookingId: str(formData.get("bookingId")) || undefined,
    groupTypeId: str(formData.get("groupTypeId")) || undefined,
    sessionId: str(formData.get("sessionId")) || undefined,
    amount: Number(str(formData.get("amount"))),
    description: str(formData.get("description")),
    paymentMethod: str(formData.get("paymentMethod")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, async (tx) => {
    const row = await createExtraFee(tx, {
      organizationId: ctx.org.id,
      clientId: parsed.data.clientId,
      athleteId: parsed.data.athleteId ?? null,
      bookingId: parsed.data.bookingId ?? null,
      groupTypeId: parsed.data.groupTypeId ?? null,
      sessionId: parsed.data.sessionId ?? null,
      amount: parsed.data.amount,
      currencySnapshot: { amount: parsed.data.amount, currency: ctx.org.currency },
      description: parsed.data.description,
      paymentMethod: parsed.data.paymentMethod,
      createdByUserId: actor.actorId!,
    });

    await recordAudit(tx, {
      action: "extra_fee.create",
      actor,
      organizationId: ctx.org.id,
      targetType: "extra_fee",
      targetId: row.id,
      targetLabel: parsed.data.description,
      metadata: {
        amount: parsed.data.amount,
        currency: ctx.org.currency,
        clientId: parsed.data.clientId,
        paymentMethod: parsed.data.paymentMethod,
      },
    });

    return row;
  });

  revalidatePath("/dashboard/extra-fees");
  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);

  return { success: t("created") };
}

// ── Bulk create (per session) ─────────────────────────────────────────────

export async function bulkCreateExtraFeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("extra_fees.manage");
  const t = await getTranslations("extraFees");

  const parsed = bulkCreateExtraFeeSchema.safeParse({
    sessionId: str(formData.get("sessionId")),
    amount: Number(str(formData.get("amount"))),
    description: str(formData.get("description")),
    paymentMethod: str(formData.get("paymentMethod")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  let created = 0;
  let failed = 0;
  const errors: { bookingId: string; error: string }[] = [];

  const bookings = await withTenant(
    ctx.org.id,
    (tx) => listSessionBookings(tx, ctx.org.id, parsed.data.sessionId),
  );

  if (bookings.length === 0) {
    return { error: t("errors.noBookingsInSession") };
  }

  // Constraint 17: each participant gets a separate extra_fee in a separate
  // transaction. Failure of one does NOT roll back others.
  for (const b of bookings) {
    if (!b.clientId) {
      failed++;
      errors.push({ bookingId: b.bookingId, error: "no client" });
      continue;
    }

    try {
      await withTenant(ctx.org.id, async (tx) => {
        await createExtraFee(tx, {
          organizationId: ctx.org.id,
          clientId: b.clientId,
          athleteId: b.athleteId,
          bookingId: b.bookingId,
          sessionId: parsed.data.sessionId,
          amount: parsed.data.amount,
          currencySnapshot: { amount: parsed.data.amount, currency: ctx.org.currency },
          description: parsed.data.description,
          paymentMethod: parsed.data.paymentMethod,
          createdByUserId: actor.actorId!,
        });
      });
      created++;
    } catch (err) {
      failed++;
      log.error("bulk extra_fee creation failed for booking", {
        bookingId: b.bookingId,
        err,
      });
      errors.push({
        bookingId: b.bookingId,
        error: "technical failure",
      });
    }
  }

  await recordAudit(db, {
    action: "extra_fee.bulk_create",
    actor,
    organizationId: ctx.org.id,
    targetType: "class_session",
    targetId: parsed.data.sessionId,
    targetLabel: parsed.data.description,
    metadata: {
      amount: parsed.data.amount,
      currency: ctx.org.currency,
      count: created,
      failed,
      sessionId: parsed.data.sessionId,
      paymentMethod: parsed.data.paymentMethod,
    },
  });

  revalidatePath("/dashboard/extra-fees");

  if (failed > 0) {
    return {
      success: t("bulkCreatedPartial", { created, failed }),
    };
  }
  return { success: t("bulkCreated", { count: created }) };
}

// ── Online payment checkout ───────────────────────────────────────────────

export async function payExtraFeeOnlineAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { checkoutUrl?: string }> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);
  const t = await getTranslations("extraFees");

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const extraFeeId = str(formData.get("extraFeeId"));
  if (!extraFeeId) {
    return { error: t("errors.generic") };
  }

  const fee = await withTenant(org.id, (tx) => getExtraFee(tx, org.id, extraFeeId));
  if (!fee) return { error: t("errors.notFound") };

  if (fee.clientId !== principal.clientId) {
    return { error: t("errors.generic") };
  }

  if (fee.status !== "pending") {
    return { error: t("errors.notPending") };
  }

  // Constraint 7: online payment requires active Stripe Connect
  await assertConnectActive(org.id);

  if (!org.stripeConnectAccountId) {
    return { error: t("errors.noStripeConnect") };
  }

  const currency = fee.currencySnapshot?.currency ?? org.currency;
  const result = await startExtraFeeConnectCheckout(
    org.id,
    org.subdomain ?? null,
    extraFeeId,
    fee.amount,
    currency,
    org.stripeConnectAccountId,
  );

  if (!result.ok) {
    return { error: t("errors.checkoutFailed") };
  }

  return { success: "/redirect-to-checkout", checkoutUrl: result.url };
}

// ── Cash confirmation ─────────────────────────────────────────────────────

export async function confirmCashExtraFeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("extra_fees.manage");
  const t = await getTranslations("extraFees");

  const parsed = confirmCashExtraFeeSchema.safeParse({
    extraFeeId: str(formData.get("extraFeeId")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  const result = await withTenant(ctx.org.id, async (tx) => {
    const updated = await lockAndConfirmCashExtraFee(
      tx,
      ctx.org.id,
      parsed.data.extraFeeId,
    );
    if (!updated) {
      return { race: true as const };
    }

    await recordAudit(tx, {
      action: "extra_fee.confirm_cash",
      actor,
      organizationId: ctx.org.id,
      targetType: "extra_fee",
      targetId: updated.id,
      targetLabel: updated.description,
      metadata: {
        amount: updated.amount,
        currency: updated.currencySnapshot?.currency,
      },
    });

    return { race: false as const };
  });

  if (result.race) {
    return { error: t("errors.alreadyPaid") };
  }

  revalidatePath("/dashboard/extra-fees");
  return { success: t("confirmed") };
}

// ── Cancel ───────────────────────────────────────────────────────────────

export async function cancelExtraFeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("extra_fees.manage");
  const t = await getTranslations("extraFees");

  const parsed = cancelExtraFeeSchema.safeParse({
    extraFeeId: str(formData.get("extraFeeId")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  const result = await withTenant(ctx.org.id, async (tx) => {
    const fee = await getExtraFee(tx, ctx.org.id, parsed.data.extraFeeId);
    if (!fee) return { notFound: true as const };

    if (fee.status === "paid") {
      return { paid: true as const };
    }

    const updated = await cancelExtraFee(tx, ctx.org.id, parsed.data.extraFeeId);
    if (!updated) return { race: true as const };

    await recordAudit(tx, {
      action: "extra_fee.cancel",
      actor,
      organizationId: ctx.org.id,
      targetType: "extra_fee",
      targetId: updated.id,
      targetLabel: updated.description,
      metadata: {
        previousStatus: "pending",
        amount: updated.amount,
      },
    });

    return { cancelled: true as const };
  });

  if (result.notFound) return { error: t("errors.notFound") };
  if (result.paid) return { error: t("errors.cannotCancelPaid") };
  if (result.race) return { error: t("errors.generic") };

  revalidatePath("/dashboard/extra-fees");
  return { success: t("cancelled") };
}

// ── Invoice actions ──────────────────────────────────────────────────────

export async function requestExtraFeeInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);
  const t = await getTranslations("extraFees");

  if (!principal || !principal.isVerified) {
    return { error: t("errors.verifyFirst") };
  }

  const parsed = requestInvoiceExtraFeeSchema.safeParse({
    extraFeeId: str(formData.get("extraFeeId")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const result = await withTenant(org.id, async (tx) => {
    const fee = await getExtraFee(tx, org.id, parsed.data.extraFeeId);
    if (!fee) return "not_found" as const;
    if (fee.clientId !== principal.clientId) return "forbidden" as const;
    await markInvoiceRequested(tx, org.id, parsed.data.extraFeeId);
    return "ok" as const;
  });

  if (result === "not_found") return { error: t("errors.notFound") };
  if (result === "forbidden") return { error: t("errors.generic") };

  revalidatePath("/moje-oplaty");
  return { success: t("invoiceRequested") };
}

export async function markExtraFeeInvoiceIssuedAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("invoices.mark_issued");
  const t = await getTranslations("extraFees");

  const parsed = markExtraFeeInvoiceIssuedSchema.safeParse({
    extraFeeId: str(formData.get("extraFeeId")),
    invoiceNumber: str(formData.get("invoiceNumber")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, (tx) =>
    markInvoiceIssued(
      tx,
      ctx.org.id,
      parsed.data.extraFeeId,
      parsed.data.invoiceNumber,
      actor.actorId,
    ),
  );

  revalidatePath("/dashboard/invoices");
  return { success: t("invoiceMarked") };
}
