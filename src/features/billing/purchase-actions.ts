"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { z } from "zod";
import {
  AthleteNotFoundError,
  ClientNotFoundError,
  confirmCashPurchase,
  ProductTemplateNotActiveError,
  ProductTemplateNotFoundError,
  PurchasePolicyViolationError,
} from "./purchases";
import { autoFillCredits } from "./auto-fill";

/**
 * Purchase server actions (langlion §2.13, EPIK 9/10, F12b).
 *
 * Purchase and auto-fill are two separate steps:
 *   1. `confirmCashPurchase` (one transaction) — creates the purchase journal
 *      entry and issues credits. Commits.
 *   2. `autoFillCredits` (separate transactions) — settles booked-offline
 *      bookings, then auto-books upcoming sessions per booking. Each booking
 *      attempt is its own transaction so a capacity conflict only rolls back
 *      that one attempt.
 *
 * Splitting them means a capacity conflict during auto-fill does not discard
 * the purchase. The remaining credits stay in the wallet.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const confirmCashPurchaseSchema = z.object({
  clientId: z.string().min(1),
  productTemplateId: z.string().min(1),
  athleteId: z.string().min(1).optional(),
});

export async function confirmCashPurchaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("credits.purchase_cash");
  const t = await getTranslations("credits");

  const parsed = confirmCashPurchaseSchema.safeParse({
    clientId: str(formData.get("clientId")),
    productTemplateId: str(formData.get("productTemplateId")),
    athleteId: str(formData.get("athleteId")) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  let purchaseResult: { purchaseId: string; creditsIssued: number; autoFill: { clientId: string; clientEmail: string; creditTypeId: string; athleteId: string | null } };
  try {
    purchaseResult = await withTenant(ctx.org.id, (tx) =>
      confirmCashPurchase(tx, {
        organizationId: ctx.org.id,
        clientId: parsed.data.clientId,
        productTemplateId: parsed.data.productTemplateId,
        athleteId: parsed.data.athleteId ?? null,
        timeZone: ctx.org.timezone,
        actor,
      }),
    );
  } catch (error) {
    if (error instanceof ProductTemplateNotFoundError) {
      return { error: t("purchase.productTemplateNotFound") };
    }
    if (error instanceof ProductTemplateNotActiveError) {
      return { error: t("purchase.productTemplateNotActive") };
    }
    if (error instanceof ClientNotFoundError) {
      return { error: t("errors.clientNotFound") };
    }
    if (error instanceof AthleteNotFoundError) {
      return { error: t("errors.athleteNotFound") };
    }
    if (error instanceof PurchasePolicyViolationError) {
      return { error: t("purchase.policyViolation") };
    }
    throw error;
  }

  // Auto-fill runs after the purchase has committed — it manages its own
  // transactions (per-booking mini-transactions), so a single capacity
  // conflict does not roll back the purchase.
  const fillResult = await autoFillCredits({
    organizationId: ctx.org.id,
    clientId: purchaseResult.autoFill.clientId,
    clientEmail: purchaseResult.autoFill.clientEmail,
    creditTypeId: purchaseResult.autoFill.creditTypeId,
    currency: ctx.org.currency,
    athleteId: purchaseResult.autoFill.athleteId,
  });

  revalidatePath("/dashboard/purchases");
  return {
    success: t("purchase.cashConfirmed", {
      credits: purchaseResult.creditsIssued,
      settled: fillResult.settled,
      filled: fillResult.filled,
    }),
  };
}
