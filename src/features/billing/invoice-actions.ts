"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { resolveActor } from "@/features/admin/audit";
import { resolveClientSession } from "@/features/client-auth/session";
import { requireOrgPermission } from "@/features/organizations/context";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { creditPurchase, user } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";

/**
 * Request an invoice for a completed credit purchase (EPIK 27, US-27.1).
 *
 * AUTHORISATION (two-layer):
 *   1. Client session — the caller must be authenticated as the client who owns
 *      this purchase. RLS alone is insufficient: it scopes by organization_id,
 *      but cannot prevent client A from requesting an invoice for client B's
 *      purchase within the same academy.
 *   2. The purchase must have invoice_requested_at IS NULL (idempotency).
 *
 * ASSUMPTION: credit_purchase always represents a completed payment at this
 * point — the row is created only after the transaction settles (cash desk
 * confirmation or online webhook). If future phases introduce a "pending
 * payment" state on credit_purchase, this action must add a payment status
 * guard. See US-27.3: invoice fields never block the purchase path.
 */
const requestInvoiceSchema = z.object({
  purchaseId: z.string().min(1),
});

export async function requestInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const org = await requireServedOrganization();
  const tc = await getTranslations("credits");

  const parsed = requestInvoiceSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
  });
  if (!parsed.success) {
    return { error: tc("errors.generic") };
  }

  const principal = await resolveClientSession(org.id);
  if (!principal?.isVerified) {
    return { error: tc("errors.generic") };
  }

  const result = await withTenant(org.id, async (tx) => {
    const [purchase] = await tx
      .select({ id: creditPurchase.id, clientId: creditPurchase.clientId })
      .from(creditPurchase)
      .where(
        and(
          eq(creditPurchase.id, parsed.data.purchaseId),
          eq(creditPurchase.organizationId, org.id),
        ),
      )
      .limit(1);
    if (!purchase) return "not_found" as const;
    if (purchase.clientId !== principal.clientId) return "forbidden" as const;
    return purchase;
  });

  if (result === "not_found") {
    return { error: tc("errors.generic") };
  }
  if (result === "forbidden") {
    return { error: tc("errors.generic") };
  }

  await withTenant(org.id, (tx) =>
    tx
      .update(creditPurchase)
      .set({ invoiceRequestedAt: new Date() })
      .where(
        and(
          eq(creditPurchase.id, result.id),
          eq(creditPurchase.organizationId, org.id),
        ),
      ),
  );

  revalidatePath("/moje-zajecia");
  return { success: tc("invoice.requested") };
}

/**
 * Mark a credit purchase's invoice as issued (US-27.2/AC2).
 *
 * Gated by `invoices.mark_issued` — reception, secretariat, admin, owner.
 *
 * US-27.2/AC3: the system allows marking even without prior invoice_requested_at
 * — a staff member may issue an invoice proactively. No guard here.
 */
const markInvoiceIssuedSchema = z.object({
  purchaseId: z.string().min(1),
  invoiceNumber: z.string().min(1),
});

export async function markInvoiceIssuedAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("invoices.mark_issued");
  const tc = await getTranslations("credits");

  const parsed = markInvoiceIssuedSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
    invoiceNumber: formData.get("invoiceNumber"),
  });
  if (!parsed.success) {
    return { error: tc("errors.generic") };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, (tx) =>
    tx
      .update(creditPurchase)
      .set({
        invoiceIssuedAt: new Date(),
        invoiceNumber: parsed.data.invoiceNumber,
        invoiceIssuedByUserId: actor.actorId,
      })
      .where(
        and(
          eq(creditPurchase.id, parsed.data.purchaseId),
          eq(creditPurchase.organizationId, ctx.org.id),
        ),
      ),
  );

  revalidatePath("/dashboard/invoices");
  return { success: tc("invoice.marked") };
}
