import { billing } from "@/lib/adapters/billing";
import type { BillingRedirectResult } from "@/lib/adapters/billing";
import { db } from "@/lib/db";
import { clientStripeCustomer } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    purchaseKind: "booking_payment",
    successUrl,
    cancelUrl,
  });
}

/**
 * Create a Checkout Session on the org's Stripe Connect account for a
 * group change price difference payment (Faza 15, EPIK 11).
 *
 * Creates a PaymentIntent for `price_difference > 0` (surcharge).
 * The webhook handler (`processGroupChangePayment`) swaps the booking
 * when the payment succeeds.
 */
export async function startConnectGroupChangeCheckout(
  orgId: string,
  subdomain: string | null,
  groupChangeRequestId: string,
  amount: number,
  currency: string,
  connectAccountId: string,
): Promise<BillingRedirectResult> {
  const successUrl = await tenantUrl(
    subdomain ?? "",
    "/moje-zajecia?status=group_change_paid",
  );
  const cancelUrl = await tenantUrl(subdomain ?? "", "/moje-zajecia");

  return billing.createConnectCheckoutSession({
    accountId: connectAccountId,
    amount,
    currency: currency.toLowerCase(),
    bookingId: groupChangeRequestId,
    organizationId: orgId,
    purchaseKind: "group_change_payment",
    successUrl,
    cancelUrl,
  });
}

/**
 * Create a Checkout Session on the org's Stripe Connect account for a
 * one-time package purchase (F12c / EPIK 9).
 *
 * Called BEFORE the purchase record exists — the webhook handler creates
 * the credit_purchase and issues credits when payment completes.
 *
 * price_data (Rozstrzygnięcie #20): when the product template has no
 * stripePriceId, the Stripe adapter creates an ad-hoc price from the
 * template's `price` and `name`. This supports per-client discounts in
 * F21 without redesigning the checkout flow.
 */
export async function startConnectPackageCheckout(
  orgId: string,
  subdomain: string | null,
  clientId: string,
  creditTypeId: string,
  productTemplateId: string,
  quantity: number,
  amount: number,
  currency: string,
  connectAccountId: string,
  stripePriceId: string | null,
): Promise<BillingRedirectResult> {
  const successUrl = await tenantUrl(
    subdomain ?? "",
    "/moje-zajecia?status=package_paid",
  );
  const cancelUrl = await tenantUrl(subdomain ?? "", "/moje-zajecia");

  return billing.createConnectPackageCheckoutSession({
    accountId: connectAccountId,
    amount,
    currency: currency.toLowerCase(),
    clientId,
    creditTypeId,
    quantity,
    mode: "payment",
    productTemplateId,
    organizationId: orgId,
    purchaseKind: "package_purchase",
    stripePriceId,
    interval: null,
    intervalCount: null,
    successUrl,
    cancelUrl,
  });
}

/**
 * Create a Checkout Session on the org's Stripe Connect account for a
 * subscription package purchase (F12d / EPIK 9).
 *
 * Before creating the session, resolves or creates the client's Stripe
 * customer on the Connected Account. This prevents duplicate customers
 * when the same client subscribes to multiple packages from the same
 * academy — all subscriptions share one customer, which is also required
 * for the Customer Portal to work correctly.
 *
 * Called BEFORE the subscription record exists — the webhook handler
 * (`processSubscriptionInitial`) creates `client_subscription` when the
 * checkout completes.
 */
export async function startConnectSubscriptionCheckout(
  orgId: string,
  subdomain: string | null,
  clientId: string,
  clientEmail: string,
  clientName: string,
  creditTypeId: string,
  productTemplateId: string,
  quantity: number,
  amount: number,
  currency: string,
  connectAccountId: string,
  stripePriceId: string | null,
  interval: "month" | "year",
  intervalCount: number,
): Promise<BillingRedirectResult> {
  // Resolve or create the Stripe customer on the Connected Account.
  const [existing] = await db
    .select({ stripeCustomerId: clientStripeCustomer.stripeCustomerId })
    .from(clientStripeCustomer)
    .where(
      and(
        eq(clientStripeCustomer.organizationId, orgId),
        eq(clientStripeCustomer.clientId, clientId),
      ),
    )
    .limit(1);

  let stripeCustomerId = existing?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const created = await billing.createConnectStripeCustomer({
      accountId: connectAccountId,
      email: clientEmail,
      name: clientName,
      metadata: { organizationId: orgId, clientId },
    });
    if (!created.ok) return created;
    stripeCustomerId = created.providerCustomerId;

    // Insert row AFTER success so we don't leave orphan rows on Stripe.
    await db.insert(clientStripeCustomer).values({
      organizationId: orgId,
      clientId,
      stripeCustomerId,
    });
  }

  const successUrl = await tenantUrl(
    subdomain ?? "",
    "/moje-zajecia?status=subscription_paid",
  );
  const cancelUrl = await tenantUrl(subdomain ?? "", "/moje-zajecia");

  return billing.createConnectPackageCheckoutSession({
    accountId: connectAccountId,
    amount,
    currency: currency.toLowerCase(),
    clientId,
    creditTypeId,
    quantity,
    mode: "subscription",
    productTemplateId,
    organizationId: orgId,
    purchaseKind: "subscription_initial",
    stripePriceId,
    interval,
    intervalCount,
    customer: stripeCustomerId,
    successUrl,
    cancelUrl,
  });
}
