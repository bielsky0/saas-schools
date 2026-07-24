/**
 * Billing provider contract (spec 1.2, 5.1 — pluggable payments backend).
 *
 * Feature/server code depends ONLY on this interface and its DTO/error types —
 * never on a provider SDK. The concrete implementation (`./stripe.ts`) wraps one
 * provider and can be swapped for Lemon Squeezy / Paddle / PayPal / Dodo / Polar
 * without touching callers.
 *
 * Scope so far: webhook verification/parsing (spec 5.4) plus the money path —
 * customer creation, checkout and portal sessions (spec 5.3, 5.5). Subscription
 * updates and invoice retrieval are still deferred; the provider's hosted portal
 * covers both for now, which is exactly why §5.5 exists.
 */

/** Provider-neutral subscription state. Mirrors what every provider models. */
export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type BillingPaymentStatus = "paid" | "failed" | "refunded";

export interface BillingSubscriptionData {
  providerSubscriptionId: string;
  providerPriceId: string;
  status: BillingSubscriptionStatus;
  quantity: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
}

export interface BillingPaymentData {
  providerPaymentId: string;
  /** Null for refunds and one-time payments — see schema/billing-payments.ts. */
  providerSubscriptionId: string | null;
  status: BillingPaymentStatus;
  /** Provider billing reason; "subscription_cycle" marks a renewal (spec 5.4). */
  reason: string | null;
  /** Minor units, exactly as the provider reports them. */
  amount: number;
  currency: string;
}

export type BillingSubscriptionEventType =
  "subscription.created" | "subscription.updated" | "subscription.canceled";

export type BillingPaymentEventType = "payment.succeeded" | "payment.failed" | "payment.refunded";

export type BillingEventType = BillingSubscriptionEventType | BillingPaymentEventType;

interface BillingEventBase {
  /** Which adapter produced this — flows into the `provider` column. */
  provider: string;
  /** The provider's event id. This is the idempotency key (spec 5.4). */
  id: string;
  /** When the PROVIDER created the event — the ordering watermark. */
  occurredAt: Date;
  /** Provider customer id, resolved to a tenant owner via `billing_customer`. */
  customerId: string;
}

/**
 * A parsed, provider-neutral event. Every subscription event carries the FULL
 * current subscription, so created/updated/canceled collapse into one upsert
 * ("the subscription looks like X as of time T") rather than three code paths.
 */
export type BillingEvent =
  | (BillingEventBase & {
      type: BillingSubscriptionEventType;
      subscription: BillingSubscriptionData;
    })
  | (BillingEventBase & { type: BillingPaymentEventType; payment: BillingPaymentData });

/**
 * Neutral error codes — callers never branch on SDK strings.
 * - NOT_CONFIGURED: no provider is wired up (BILLING_PROVIDER=none).
 * - INVALID_SIGNATURE: missing, malformed, stale or forged signature.
 * - MALFORMED_PAYLOAD: signature valid, but the body is not the shape we parse
 *   (typically provider API-version skew) — a real bug worth surfacing.
 */
export type BillingWebhookErrorCode =
  "NOT_CONFIGURED" | "INVALID_SIGNATURE" | "MALFORMED_PAYLOAD" | "UNKNOWN";

/**
 * Two orthogonal questions, two fields: `ok` answers "is this request
 * authentic?", `status` answers "do we act on it?". Splitting them forces the
 * route into an exhaustive switch, and beats `event: BillingEvent | null` where
 * "null means ignored" is implicit and easy to mishandle.
 */
export type VerifyWebhookResult =
  | { ok: true; status: "handled"; event: BillingEvent }
  /** Authentic, but a type we deliberately do not process. `eventType` is the
   *  raw provider string, carried for logging only — never for control flow. */
  | { ok: true; status: "ignored"; eventId: string; eventType: string }
  | { ok: false; code: BillingWebhookErrorCode };

/**
 * Neutral error codes for the money-path operations (spec 5.3, 5.5).
 *
 * Separate from `BillingWebhookErrorCode` because the failure modes do not
 * overlap: a webhook can be forged, an outbound API call cannot. `PROVIDER_ERROR`
 * is deliberately coarse — callers must not branch on a provider's error taxonomy,
 * which is precisely the lock-in this layer exists to prevent (spec 1.2). The
 * adapter logs the underlying cause; the caller gets a 502 and a generic message.
 */
export type BillingOperationErrorCode = "NOT_CONFIGURED" | "PROVIDER_ERROR";

/**
 * Checkout and portal both answer the same question — "where do I send the
 * browser?" — so they share one result shape. The provider hosts the page
 * (spec 5.3: we never build a card form, keeping PCI-DSS scope minimal).
 */
export type BillingRedirectResult =
  { ok: true; url: string } | { ok: false; code: BillingOperationErrorCode };

export type CreateCustomerResult =
  { ok: true; providerCustomerId: string } | { ok: false; code: BillingOperationErrorCode };

export interface CreateCustomerInput {
  email: string;
  name: string | null;
  /**
   * Tenant identity mirrored onto the provider record, for support and for
   * reconciliation when someone is staring at a provider dashboard. NEVER read
   * back as an authorization input: `billing_customer` is the only mapping we
   * trust (spec 5.4), because provider metadata is mutable from their UI.
   */
  metadata?: Record<string, string>;
}

export interface CheckoutSessionInput {
  providerCustomerId: string;
  providerPriceId: string;
  /** Seats for per-seat plans (spec 5.2); 1 for flat-rate. */
  quantity: number;
  /** Recurring plan vs one-time purchase — both required by spec 5.2. */
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionInput {
  providerCustomerId: string;
  returnUrl: string;
  /** The Stripe Connect account id. Required when creating a Customer Portal
   *  session on a Connected Account (stripeAccount header), omitted for the
   *  platform's own portal. */
  accountId?: string;
}

// ── Faza 10 — Stripe Connect (EPIK 30) ───────────────────────────────────

/** Stripe Connect account status, managed exclusively by webhooks. */
export type ConnectAccountStatus =
  | "not_connected"
  | "onboarding_incomplete"
  | "active"
  | "restricted"
  | "disabled";

export type ConnectEventType =
  | "account.updated"
  | "account.application.deauthorized"
  | "checkout.session.completed"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "customer.subscription.deleted";

/** Fields common to every Connect webhook event. */
interface ConnectEventBase {
  /** Which adapter produced this. */
  provider: string;
  /** The provider's event id — the idempotency key. */
  id: string;
  /** When the provider created the event. */
  occurredAt: Date;
  /** The Connect account id (acct_xxx) the event is about. */
  accountId: string;
}

/**
 * An account-level event — status sync from Stripe Connect.
 */
export interface ConnectAccountEvent extends ConnectEventBase {
  type: "account.updated" | "account.application.deauthorized";
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

/**
 * A payment event on a Connected Account — checkout completed by a customer.
 * Arrives via the Connect webhook because the session was created as a direct
 * charge on the connected account (stripeAccount header), not on the platform.
 */
export interface ConnectPaymentEvent extends ConnectEventBase {
  type: "checkout.session.completed";
  /** The Stripe Checkout Session id (cs_xxx). */
  sessionId: string;
  /** The payment status from the session: "paid" | "unpaid". */
  paymentStatus: string;
  /** Total amount in minor units. */
  amount: number;
  /** ISO 4217 currency code, lowercase (e.g. "pln"). */
  currency: string;
  /** Custom metadata written at session creation — contains bookingId, organizationId. */
  metadata: Record<string, string>;
  /** The Stripe subscription id (sub_xxx). Set when checkout mode is "subscription"
   *  (purchaseKind = "subscription_initial"). The webhook handler uses this to
   *  upsert `client_subscription` by `stripeSubscriptionId`. */
  subscriptionId?: string;
}

/**
 * A subscription lifecycle event on a Connected Account (F12d).
 *
 * Stripe delivers these to the Connect webhook endpoint when the event relates
 * to a Connected Account. The three event types map to three lifecycle state
 * transitions: invoice.paid → credits issued, invoice.payment_failed → past_due,
 * customer.subscription.deleted → canceled.
 */
export interface ConnectSubscriptionEvent extends ConnectEventBase {
  type: "invoice.paid" | "invoice.payment_failed" | "customer.subscription.deleted";
  /** The Stripe subscription id (sub_xxx) — the idempotency key for the
   *  find-or-create in `client_subscription`. */
  stripeSubscriptionId: string;
  /** The Stripe customer id (cus_xxx) on the Connected Account. Used to resolve
   *  the client via `client_stripe_customer`. */
  stripeCustomerId: string;
  /** The Stripe invoice id. Only set for invoice.* events. */
  invoiceId?: string;
  /** Invoice amount in minor units. Only set for invoice.* events. */
  amount?: number;
  /** ISO 4217 currency code. Only set for invoice.* events. */
  currency?: string;
}

export type ConnectEvent = ConnectAccountEvent | ConnectPaymentEvent | ConnectSubscriptionEvent;

export interface CreateConnectAccountInput {
  /** ISO 3166-1 alpha-2 country code. Must be in Stripe's supported list. */
  country: string;
}

export type CreateConnectAccountResult =
  | { ok: true; accountId: string }
  | { ok: false; code: BillingOperationErrorCode };

export interface CreateAccountOnboardingLinkInput {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}

// ── Faza 11 — Online single-class checkout (EPIK 5) ─────────────────────

/**
 * Input for creating a Stripe Checkout Session on a Connected Account
 * (direct charge via stripeAccount header).
 */
export interface ConnectCheckoutInput {
  /** The org's Stripe Connect account id (acct_xxx). */
  accountId: string;
  /** Amount in minor units — from booking.priceSnapshot.amount. */
  amount: number;
  /** ISO 4217 currency, lowercase — from booking.priceSnapshot.currency. */
  currency: string;
  /**
   * The booking id — stored in session metadata for webhook correlation.
   * For group_change_payment, this holds the groupChangeRequestId instead.
   */
  bookingId: string;
  /** The organization id — also in metadata for tenant resolution. */
  organizationId: string;
  /** Which kind of purchase this is — routes the webhook handler (F12, F15). */
  purchaseKind: PurchaseKind;
  successUrl: string;
  cancelUrl: string;
}

export type VerifyConnectWebhookResult =
  | { ok: true; status: "handled"; event: ConnectEvent }
  | { ok: true; status: "ignored"; eventId: string; eventType: string }
  | { ok: false; code: BillingWebhookErrorCode };

// ── Faza 12 — Pakiety i subskrypcje (EPIK 9/10/23/25) ──────────────────

/**
 * Discriminator written into Checkout Session metadata so the Connect webhook
 * handler can route checkout.session.completed to the correct processor.
 *
 * Three sources produce the same event type on the same webhook endpoint:
 *   - F11 single-booking payment
 *   - F12c one-time package purchase
 *   - F12d subscription initial checkout
 *
 * Routing by this field, not by presence/absence of bookingId — the latter is
 * fragile and breaks the moment a new flow omits it.
 */
export type PurchaseKind = "booking_payment" | "package_purchase" | "subscription_initial" | "group_change_payment";

/**
 * Input for creating a Checkout Session on a Connected Account for a package
 * purchase (one-time or subscription, F12c/d).
 *
 * Different from ConnectCheckoutInput in two ways:
 *   1. No bookingId — the booking doesn't exist yet; credits are issued
 *      post-payment and then auto-filled.
 *   2. clientId + creditTypeId — needed to resolve the template and to
 *      find/create the Stripe customer on the Connected Account.
 */
export interface ConnectPackageCheckoutInput {
  /** The org's Stripe Connect account id (acct_xxx). */
  accountId: string;
  /** Amount in minor units. */
  amount: number;
  /** ISO 4217 currency, lowercase. */
  currency: string;
  /** The client (parent) making the purchase. */
  clientId: string;
  /** The credit type (resolves to group_type via 1:1). */
  creditTypeId: string;
  /** How many credits in this package. */
  quantity: number;
  /** One-time payment or subscription. */
  mode: "payment" | "subscription";
  /** The product template being purchased. */
  productTemplateId: string;
  /** The organization id — stored in metadata for tenant resolution. */
  organizationId: string;
  /** Which kind of purchase this is — routes the webhook handler. */
  purchaseKind: PurchaseKind;
  /** Stripe Price id OR ad-hoc price_data. At least one must be set.
   *  Rozstrzygnięcie #20: price_data support is mandatory from the start,
   *  not deferred to F21. */
  stripePriceId: string | null;
  /** Interval for subscription mode. */
  interval: "month" | "year" | null;
  /** Interval count for subscription mode. */
  intervalCount: number | null;
  /** The Stripe customer id on the Connected Account. Passed as `customer` on the
   *  session so subsequent invoices link to the same customer. Required for
   *  subscription mode to avoid duplicate customers on Connect. */
  customer?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Input for creating a Stripe customer on the Connected Account per client. */
export interface ConnectStripeCustomerInput {
  accountId: string;
  /** The client's email. */
  email: string;
  /** The client's name for the Stripe record. */
  name: string;
  /** Tenant identity — never read back as authorization input. */
  metadata: Record<string, string>;
}

export interface BillingAdapter {
  /**
   * Which provider this adapter is, e.g. "stripe". Persisted on `billing_customer`
   * so two providers can coexist during a migration (spec 5.1) — the caller must
   * not hardcode a provider key it happens to know.
   */
  readonly provider: string;

  /**
   * Verify a webhook's signature and parse it into a neutral event.
   *
   * Takes the RAW request body: signatures are computed over the exact bytes
   * sent, so any re-serialization invalidates them. Takes `headers` (mirroring
   * `AuthAdapter`) so each adapter can read its own signature header.
   *
   * Async even where the underlying verification is synchronous, so an adapter
   * can move to WebCrypto (edge runtime) without a contract change.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifyWebhookResult>;

  /**
   * Create a customer on the provider and return its id.
   *
   * Deliberately does NOT write `billing_customer` — adapters know nothing about
   * our schema. The caller persists the mapping, and must do so BEFORE creating a
   * checkout session (the invariant documented on `schema/billing-customers.ts`):
   * that ordering is what lets the webhook treat an unresolvable customer as "not
   * ours" and ignore it, instead of retrying forever against a row that never
   * existed.
   */
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;

  /** Hosted checkout page for a plan purchase (spec 5.3). */
  createCheckoutSession(input: CheckoutSessionInput): Promise<BillingRedirectResult>;

  /**
   * Hosted customer portal: payment method, invoices, plan changes and
   * cancellation (spec 5.5). Changes made there come back as webhooks — the app
   * never polls the provider on page load.
   */
  createPortalSession(input: PortalSessionInput): Promise<BillingRedirectResult>;

  // ── Faza 10 — Stripe Connect (EPIK 30) ─────────────────────────────────

  /**
   * Verify a Connect webhook signature and parse it into a neutral ConnectEvent.
   * Uses a DIFFERENT signing secret than the platform billing webhook.
   * See the separate route at /api/billing/connect/webhook.
   */
  verifyConnectWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<VerifyConnectWebhookResult>;

  /**
   * Create a Stripe Standard Connect account for an organization.
   * The `country` must be in Stripe's supported list for Connect accounts.
   * Does NOT write to our database — the caller persists the mapping.
   */
  createConnectAccount(
    input: CreateConnectAccountInput,
  ): Promise<CreateConnectAccountResult>;

  /**
   * Generate an onboarding link (Account Link) for the Connect account.
   * Stripe hosts the onboarding flow; `refreshUrl` sends the user back to
   * regenerate the link when it expires. Status is updated exclusively via
   * webhook (account.updated), never from this redirect.
   */
  createAccountOnboardingLink(
    input: CreateAccountOnboardingLinkInput,
  ): Promise<BillingRedirectResult>;

  // ── Faza 11 — Online single-class checkout (EPIK 5) ─────────────────

  /**
   * Create a Checkout Session on a Connected Account (direct charge).
   *
   * Stripe is told to create the session ON the connected account (via the
   * `stripeAccount` per-request header), so the payment flows through the
   * academy's own Stripe account, not the platform's. The resulting webhook
   * event (`checkout.session.completed`) arrives on the Connect webhook
   * endpoint, not the platform billing one.
   */
  createConnectCheckoutSession(
    input: ConnectCheckoutInput,
  ): Promise<BillingRedirectResult>;

  // ── Faza 12 — Pakiety i subskrypcje (EPIK 9/10/23/25) ─────────────────

  /**
   * Create a Checkout Session on a Connected Account for a package purchase
   * (one-time or subscription). Supports both stripePriceId and ad-hoc
   * price_data per Rozstrzygnięcie #20.
   */
  createConnectPackageCheckoutSession(
    input: ConnectPackageCheckoutInput,
  ): Promise<BillingRedirectResult>;

  /**
   * Create a Stripe customer on the Connected Account for a client.
   * One customer per client–academy pair, tracked in `client_stripe_customer`.
   */
  createConnectStripeCustomer(
    input: ConnectStripeCustomerInput,
  ): Promise<CreateCustomerResult>;

  /**
   * Create a Customer Portal session on the Connected Account for a client
   * to manage their payment method and cancel their subscription.
   */
  createConnectPortalSession(input: PortalSessionInput): Promise<BillingRedirectResult>;
}
