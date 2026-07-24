import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import type { JobHandler } from "@/lib/adapters/jobs";
import { recordAudit, SYSTEM_ACTOR } from "@/features/admin/audit";
import { creditPurchase, organization } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { withSystemBypass } from "@/lib/db/system";
import { billing } from "@/lib/adapters/billing";
import { createLogger } from "@/lib/logger";

const log = createLogger("credits:refund-recover");

/**
 * Cron recovery for stuck pending_refund after online refund (Faza 16).
 *
 * PROBLEM: In refundInitiateAction (krok 7), the transaction that transitions
 * credits to pending_refund and sets refund_initiated_at COMMITS before the
 * Stripe Refund API is called. If the server crashes between the commit and
 * the API call, the refund is stuck — credits are pending_refund but Stripe
 * never received a refund request.
 *
 * TWO-LAYER RECOVERY:
 *   Layer A (interaction recovery) — when an admin views the credit_purchase
 *   in the UI, if refund_initiated_at is set, refunded_at is null, and the
 *   timeout has passed, the UI/action retries createConnectRefund idempotently
 *   (Stripe idempotency key protects against double refund).
 *
 *   Layer B (cron) — this handler. Checks for online credit_purchases where
 *   refund_initiated_at is older than 30 minutes but refunded_at is still null.
 *   Does NOT finalise the refund itself — that would bypass the webhook as the
 *   source of truth. It only retries the createConnectRefund call.
 */
export const refundsRecoverHandler: JobHandler<"refunds.recover"> = async () => {
  const cutoff = new Date(Date.now() - 30 * 60_000);

  await withSystemBypass(
    "refunds.recover — no user session, system job",
    async (tx) => {
      const stuck = await tx
        .select({
          id: creditPurchase.id,
          organizationId: creditPurchase.organizationId,
          stripePaymentIntentId: creditPurchase.stripePaymentIntentId,
          refundAmount: creditPurchase.refundAmount,
        })
        .from(creditPurchase)
        .where(
          and(
            isNotNull(creditPurchase.refundInitiatedAt),
            isNull(creditPurchase.refundedAt),
            lt(creditPurchase.refundInitiatedAt, cutoff),
          ),
        )
        .for("update");

      if (stuck.length === 0) return;

      for (const cp of stuck) {
        // Online-only: cash refunds have no Stripe API call, so they cannot get stuck.
        if (!cp.stripePaymentIntentId || !cp.refundAmount) continue;

        try {
          // Resolve the Connect account for this organization.
          const account = await resolveConnectAccount(cp.organizationId);
          if (!account) {
            log.warn("refund recovery: no connect account for org", { orgId: cp.organizationId });
            continue;
          }

          const result = await billing.createConnectRefund({
            accountId: account,
            paymentIntentId: cp.stripePaymentIntentId,
            amount: cp.refundAmount,
            idempotencyKey: `recovery:${cp.id}`,
            metadata: { creditPurchaseId: cp.id, organizationId: cp.organizationId },
          });

          if (!result.ok) {
            log.error("refund recovery: Stripe API call failed", {
              purchaseId: cp.id,
              error: result.code,
            });
            await recordAudit(tx, {
              action: "credit.refund_recovery_failed",
              actor: SYSTEM_ACTOR,
              organizationId: cp.organizationId,
              targetType: "credit_purchase",
              targetId: cp.id,
              targetLabel: cp.id,
              metadata: { error: result.code },
            });
          }
        } catch (err) {
          log.error("refund recovery: unexpected error", { purchaseId: cp.id, err });
        }
      }
    },
  );
};

async function resolveConnectAccount(organizationId: string): Promise<string | null> {
  const [org] = await db
    .select({ stripeConnectAccountId: organization.stripeConnectAccountId })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return org?.stripeConnectAccountId ?? null;
}
