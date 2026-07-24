"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { billing } from "@/lib/adapters/billing";
import { recordAudit, resolveActor } from "@/features/admin/audit";
import { cancelFutureBookingsForRefund } from "@/features/credits/refund-cancel";
import { requireOrgPermission } from "@/features/organizations/context";
import { emitDomainNotification } from "@/features/notifications/emit";
import { client, credit, creditPurchase, organization } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { withSystemBypass } from "@/lib/db/system";
import type { FormState } from "@/lib/validation";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("billing:refund");

const refundInitiateSchema = z.object({
  creditPurchaseId: z.string().min(1),
  variant: z.enum(["partial", "full_reversal"]),
});

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Initiate a refund on a credit purchase (Faza 16, US-18.x).
 *
 * FLOW (online):
 *   Transaction 1 (commits first):
 *     available credits → pending_refund, set refund_initiated_at
 *   → Stripe Refund API (idempotency key = creditPurchaseId)
 *   → Wait for charge.refunded webhook (source of truth)
 *
 *   On API error: Transaction 2: pending_refund → available, clear refund_initiated_at
 *
 * FLOW (cash):
 *   Single transaction:
 *     available credits → refunded, set refunded_at/refund_amount/confirmed_by
 *     If full_reversal: also cancel future bookings + cascade GCR
 *
 * LAYER A recovery: if an admin views a purchase with stale refund_initiated_at
 * (set >5min ago, refunded_at still null), the UI triggers an idempotent retry
 * of createConnectRefund.
 */
export async function refundInitiateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("refunds.issue");
  const t = await getTranslations("credits");

  const parsed = refundInitiateSchema.safeParse({
    creditPurchaseId: str(formData.get("creditPurchaseId")),
    variant: str(formData.get("variant")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  const { creditPurchaseId, variant } = parsed.data;
  const actor = await resolveActor(ctx.session);

  // ── Load the purchase and calculate the refund ───────────────────────
  // Two-pass: first resolve the purchase (needs system bypass for cross-tenant
  // data), then run the core mutation inside withTenant for RLS.

  const purchaseData = await withSystemBypass(
    "refundInitiateAction: resolve purchase data — cross-tenant read",
    async (tx) => {
      const [cp] = await tx
        .select({
          id: creditPurchase.id,
          organizationId: creditPurchase.organizationId,
          clientId: creditPurchase.clientId,
          quantity: creditPurchase.quantity,
          pricePaid: creditPurchase.pricePaid,
          refundInitiatedAt: creditPurchase.refundInitiatedAt,
          refundedAt: creditPurchase.refundedAt,
          paymentMethod: creditPurchase.paymentMethod,
          stripeSessionId: creditPurchase.stripeSessionId,
          stripePaymentIntentId: creditPurchase.stripePaymentIntentId,
        })
        .from(creditPurchase)
        .where(eq(creditPurchase.id, creditPurchaseId))
        .limit(1);

      if (!cp) {
        return { error: "Purchase not found" } as const;
      }
      if (cp.refundInitiatedAt) {
        return { error: "Refund already initiated" } as const;
      }
      if (cp.refundedAt) {
        return { error: "Purchase already refunded" } as const;
      }

      // Count unused (available) credits.
      const [unusedRow] = await tx
        .select({ value: count() })
        .from(credit)
        .where(
          and(
            eq(credit.creditPurchaseId, cp.id),
            eq(credit.status, "available"),
          ),
        );
      const unusedCount = unusedRow?.value ?? 0;
      if (unusedCount === 0) {
        return { error: "No unused credits to refund" } as const;
      }

      // Refund formula: (unused / purchased) × price_paid, integer division.
      const refundAmount = Math.floor((unusedCount / cp.quantity) * cp.pricePaid);

      return { cp, unusedCount, refundAmount };
    },
  );

  if ("error" in purchaseData) {
    return { error: purchaseData.error };
  }

  const { cp, unusedCount, refundAmount } = purchaseData;

  // ── Transaction 1: set pending_refund + initiation fields ────────────

  let stripePaymentIntentId: string | null = cp.stripePaymentIntentId;

  // For online_one_time without a stored PI: resolve from Checkout Session.
  if (!stripePaymentIntentId && cp.paymentMethod === "online_one_time" && cp.stripeSessionId) {
    const [org] = await withSystemBypass(
      "refundInitiateAction: resolve org for Connect account",
      async (tx) => {
        return tx
          .select({ stripeConnectAccountId: organization.stripeConnectAccountId })
          .from(organization)
          .where(eq(organization.id, ctx.org.id))
          .limit(1);
      },
    );

    if (org?.stripeConnectAccountId) {
      const piResult = await billing.resolveConnectPaymentIntentId(
        cp.stripeSessionId,
        org.stripeConnectAccountId,
      );
      if (piResult.ok) {
        stripePaymentIntentId = piResult.paymentIntentId;
      } else {
        log.warn("could not resolve payment intent for refund", {
          purchaseId: cp.id,
          sessionId: cp.stripeSessionId,
        });
      }
    }
  }

  try {
    await withTenant(ctx.org.id, async (tx) => {
      // Lock the purchase row.
      const [locked] = await tx
        .select({
          id: creditPurchase.id,
          refundInitiatedAt: creditPurchase.refundInitiatedAt,
        })
        .from(creditPurchase)
        .where(eq(creditPurchase.id, cp.id))
        .limit(1)
        .for("update");

      if (!locked || locked.refundInitiatedAt) {
        throw new Error("Refund already initiated by concurrent request");
      }

      // Atomically: available → pending_refund.
      await tx
        .update(credit)
        .set({ status: "pending_refund" })
        .where(
          and(
            eq(credit.creditPurchaseId, cp.id),
            eq(credit.status, "available"),
          ),
        );

      // Set refund initiation fields.
      await tx
        .update(creditPurchase)
        .set({
          refundInitiatedAt: new Date(),
          refundVariant: variant,
          refundAmount,
          stripePaymentIntentId,
        })
        .where(eq(creditPurchase.id, cp.id));

      // Cash path: confirm immediately in the same transaction.
      if (cp.paymentMethod === "cash") {
        await tx
          .update(credit)
          .set({ status: "refunded" })
          .where(
            and(
              eq(credit.creditPurchaseId, cp.id),
              eq(credit.status, "pending_refund"),
            ),
          );

        if (variant === "full_reversal") {
          await cancelFutureBookingsForRefund(tx, {
            organizationId: ctx.org.id,
            creditPurchaseId: cp.id,
            actor,
          });
        }

        await tx
          .update(creditPurchase)
          .set({
            refundedAt: new Date(),
            refundConfirmedByUserId: actor.actorId ?? undefined,
          })
          .where(eq(creditPurchase.id, cp.id));

        // Notify client.
        const [clientRow] = await tx
          .select({ email: client.email })
          .from(client)
          .where(eq(client.id, cp.clientId))
          .limit(1);

        if (clientRow) {
          await emitDomainNotification(tx, {
            eventType: "refund-confirmed",
            organizationId: ctx.org.id,
            accountId: null,
            recipients: [{
              kind: "client",
              clientId: cp.clientId,
              email: clientRow.email,
              locale: "pl",
            }],
            params: {
              refundAmount: String(refundAmount),
              refundVariant: variant,
            },
            dedupeBasis: `refund:${cp.id}`,
          });
        }
      }

      // Audit.
      await recordAudit(tx, {
        action: cp.paymentMethod === "cash" ? "credit.refund_confirmed" : "credit.refund_initiate",
        actor,
        organizationId: ctx.org.id,
        targetType: "credit_purchase",
        targetId: cp.id,
        targetLabel: cp.id,
        metadata: {
          variant,
          refundAmount,
          unusedCount,
          totalQuantity: cp.quantity,
          paymentMethod: cp.paymentMethod,
        },
      });
    });

    // ── Online path: call Stripe AFTER the commit ──────────────────────
    if (cp.paymentMethod !== "cash") {
      if (stripePaymentIntentId) {
        const [org] = await withSystemBypass(
          "refundInitiateAction: resolve Connect account for Stripe call",
          async (tx) => {
            return tx
              .select({ stripeConnectAccountId: organization.stripeConnectAccountId })
              .from(organization)
              .where(eq(organization.id, ctx.org.id))
              .limit(1);
          },
        );

        if (org?.stripeConnectAccountId) {
          const result = await billing.createConnectRefund({
            accountId: org.stripeConnectAccountId,
            paymentIntentId: stripePaymentIntentId,
            amount: refundAmount,
            idempotencyKey: cp.id,
            metadata: { creditPurchaseId: cp.id, organizationId: ctx.org.id },
          });

          if (!result.ok) {
            // Stripe API failed → rollback pending_refund to available.
            log.error("Stripe refund API call failed", {
              purchaseId: cp.id,
              error: result.code,
            });

            await withTenant(ctx.org.id, async (tx) => {
              await tx
                .update(credit)
                .set({ status: "available" })
                .where(
                  and(
                    eq(credit.creditPurchaseId, cp.id),
                    eq(credit.status, "pending_refund"),
                  ),
                );

              await tx
                .update(creditPurchase)
                .set({
                  refundInitiatedAt: null,
                  refundVariant: null,
                  refundAmount: null,
                })
                .where(eq(creditPurchase.id, cp.id));

              await recordAudit(tx, {
                action: "credit.refund_failed",
                actor,
                organizationId: ctx.org.id,
                targetType: "credit_purchase",
                targetId: cp.id,
                targetLabel: cp.id,
                metadata: {
                  stripeError: result.code,
                  variant,
                },
              });
            });

            revalidatePath("/dashboard/refunds");
            return { error: t("purchase.refundFailed", { error: result.code }) };
          }
        }
      }
    }

    revalidatePath("/dashboard/refunds");
    return { success: t("purchase.refundInitiated", { variant }) };
  } catch (error) {
    log.error("refundInitiateAction failed", { purchaseId: cp.id, error });
    return { error: t("errors.generic") };
  }
}
