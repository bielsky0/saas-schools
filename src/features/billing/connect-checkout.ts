import { billing } from "@/lib/adapters/billing";
import type { BillingRedirectResult } from "@/lib/adapters/billing";
import { tenantUrl } from "@/lib/tenant-url";

/**
 * Create a Checkout Session on the org's Stripe Connect account for a
 * single-class payment (F11 / EPIK 5).
 *
 * Called AFTER the booking is created in `payment_pending` status, never
 * before. The booking commit is the precondition — the webhook handler needs
 * it to exist before it can resolve the payment event.
 *
 * Stripe call happens OUTSIDE the booking transaction (same deadlock-aware
 * pattern as `startCheckout` in `./checkout.ts`): holding a pooled connection
 * across the Stripe HTTP round-trip is the wedge documented there.
 */
export async function startConnectCheckout(
  orgId: string,
  subdomain: string | null,
  bookingId: string,
  amount: number,
  currency: string,
  connectAccountId: string,
): Promise<BillingRedirectResult> {
  const successUrl = await tenantUrl(
    subdomain ?? "",
    "/moje-zajecia?status=payment_pending",
  );
  const cancelUrl = await tenantUrl(subdomain ?? "", "/moje-zajecia");

  return billing.createConnectCheckoutSession({
    accountId: connectAccountId,
    amount,
    currency: currency.toLowerCase(),
    bookingId,
    organizationId: orgId,
    successUrl,
    cancelUrl,
  });
}
