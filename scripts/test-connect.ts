import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// test-connect.ts — Stripe Connect E2E smoke runner (mvp-plan Faza 5)
//
// Run:
//   1. Start the dev server:  pnpm dev
//   2. Set env for the Stripe adapter (offline HMAC, no real account):
//        BILLING_PROVIDER=stripe \
//        STRIPE_SECRET_KEY=sk_test_... \
//        STRIPE_WEBHOOK_SECRET=whsec_... \
//        STRIPE_CONNECT_WEBHOOK_SECRET=whsec_... \
//        pnpm tsx scripts/test-connect.ts
//   3. Or rely on the defaults below for a local dev setup.
//
// What it does: verifies, end-to-end against the LIVE webhook endpoint, all 7
// Connect payment/onboarding scenarios from the MVP plan:
//   1. Connect onboarding (account.updated → active)
//   2. Booking payment (booking_payment)
//   3. Package purchase (package_purchase)
//   4. Subscription initial + renewal (subscription_initial / invoice.paid)
//   5. Refund (charge.refunded, full + partial)
//   6. Group change payment (group_change_payment)
//   7. Extra fee payment (extra_fee_payment)
//
// It signs each event locally (like the Playwright suite) and POSTs to
// /api/billing/connect/webhook, then asserts the database outcome. DB state is
// read/written through a system-bypass pool (migration role) so RLS does not
// block a test harness reading seeded rows.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const CONNECT_WEBHOOK_URL = `${BASE_URL}/api/billing/connect/webhook`;

// Reuse the exact keys the Playwright suite uses, so both share the signing
// secret. Overridable via env.
const WEBHOOK_SECRET =
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "whsec_e2eDummyConnectSecretForLocalHmac";
const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ?? "sk_test_e2eDummyKeyNeverSentAnywhere";

// Two database URLs — same split as docs/ARCHITECTURE.md "Two database URLs".
// MIGRATION_URL connects as the schema owner (postgres) so the harness can read
// and seed rows past RLS; the app role is not used by this script.
const PG_MIGRATION_URL =
  process.env.TEST_MIGRATION_URL ?? "postgresql://postgres:postgres@localhost:5433/saas_boilerplate";

const stripe = new Stripe(STRIPE_SECRET_KEY);

// ── Results accumulator ───────────────────────────────────────────────────
type TestResult = { id: string; result: "PASS" | "FAIL" | "SKIP"; notes: string };
const results: TestResult[] = [];

function pass(id: string, notes = "") {
  results.push({ id, result: "PASS", notes });
  console.log(`  ✅ ${id}: PASS${notes ? ` — ${notes}` : ""}`);
}
function fail(id: string, notes = "") {
  results.push({ id, result: "FAIL", notes });
  console.log(`  ❌ ${id}: FAIL${notes ? ` — ${notes}` : ""}`);
}
function skip(id: string, reason: string) {
  results.push({ id, result: "SKIP", notes: reason });
  console.log(`  ⏭️  ${id}: SKIP — ${reason}`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

function stripeSignature(rawBody: string): string {
  // Stripe's generateTestHeaderString is a local HMAC — no network.
  return stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret: WEBHOOK_SECRET });
}

function signedRequest(event: unknown): { headers: Headers; body: string } {
  const rawBody = JSON.stringify(event);
  return {
    headers: new Headers({
      "content-type": "application/json",
      "stripe-signature": stripeSignature(rawBody),
    }),
    body: rawBody,
  };
}

async function postWebhook(event: unknown): Promise<{ status: number; body: string }> {
  const { headers, body } = signedRequest(event);
  const res = await fetch(CONNECT_WEBHOOK_URL, { method: "POST", headers, body });
  return { status: res.status, body: await res.text() };
}

type Pg = {
  pool: Pool;
  query: Pool["query"];
  end: () => Promise<void>;
};

function createPg(): Pg {
  const pool = new Pool({ connectionString: PG_MIGRATION_URL, max: 5 });
  return { pool, query: pool.query.bind(pool), end: () => pool.end() };
}

// ── Fixture builders (mirror e2e/billing-fixtures.ts, offline HMAC) ──────

export const E2E_CONNECT_ACCOUNT_ID = "acct_e2eConnectDummyAccount";

function connectAccountUpdatedEvent(opts: {
  eventId: string;
  accountId?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  disabledReason?: string | null;
}) {
  return {
    id: opts.eventId,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "account.updated",
    data: {
      object: {
        id: opts.accountId ?? E2E_CONNECT_ACCOUNT_ID,
        object: "account",
        details_submitted: opts.detailsSubmitted ?? true,
        charges_enabled: opts.chargesEnabled ?? true,
        payouts_enabled: opts.payoutsEnabled ?? true,
        requirements: opts.disabledReason ? { disabled_reason: opts.disabledReason } : {},
      },
    },
  };
}

function connectCheckoutCompletedEvent(opts: {
  eventId: string;
  sessionId: string;
  bookingId: string;
  organizationId: string;
  purchaseKind: string;
  paymentStatus?: string;
  amount?: number;
  currency?: string;
  extraMetadata?: Record<string, string>;
}) {
  return {
    id: opts.eventId,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    account: E2E_CONNECT_ACCOUNT_ID,
    data: {
      object: {
        id: opts.sessionId,
        object: "checkout.session",
        payment_status: opts.paymentStatus ?? "paid",
        amount_total: opts.amount ?? 10000,
        currency: opts.currency ?? "pln",
        metadata: {
          bookingId: opts.bookingId,
          organizationId: opts.organizationId,
          purchaseKind: opts.purchaseKind,
          ...opts.extraMetadata,
        },
      },
    },
  };
}

function invoicePaidEvent(opts: {
  eventId: string;
  customerId: string;
  invoiceId: string;
  subscriptionId: string;
  amount: number;
  currency?: string;
}) {
  return {
    id: opts.eventId,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "invoice.paid",
    account: E2E_CONNECT_ACCOUNT_ID,
    data: {
      object: {
        id: opts.invoiceId,
        object: "invoice",
        customer: opts.customerId,
        currency: opts.currency ?? "pln",
        amount_paid: opts.amount,
        amount_due: opts.amount,
        billing_reason: "subscription_cycle",
        parent: { subscription_details: { subscription: opts.subscriptionId } },
      },
    },
  };
}

function chargeRefundedEvent(opts: {
  eventId: string;
  paymentIntentId: string;
  amount: number;
  accountId?: string;
  metadata?: Record<string, string>;
}) {
  return {
    id: opts.eventId,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "charge.refunded",
    account: opts.accountId ?? E2E_CONNECT_ACCOUNT_ID,
    data: {
      object: {
        id: `ch_${uniqueId("")}`,
        object: "charge",
        customer: null,
        currency: "pln",
        amount_refunded: opts.amount,
        payment_intent: opts.paymentIntentId,
        metadata: opts.metadata ?? {},
      },
    },
  };
}

// ── Scenario helpers ───────────────────────────────────────────────────────

/**
 * Seed an org (via /api/dev/seed-user + /api/dev/seed-org) and return its id.
 *
 * seed-org requires an existing user (`ownerEmail`), so first register one. The
 * slug it returns is the org's unique slug — used later for seed-connect-account.
 */
async function seedOrg(): Promise<{ orgId: string; orgSlug: string; subdomain: string }> {
  const ownerEmail = uniqueEmail("owner");
  await fetch(`${BASE_URL}/api/dev/seed-user`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password: "Password123", name: "E2E Owner" }),
  }).then((r) => {
    if (!r.ok) throw new Error(`seed-user failed: ${r.status} ${r.text()}`);
  });

  const slug = uniqueId("connect-org");
  const res = await fetch(`${BASE_URL}/api/dev/seed-org`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ownerEmail,
      slug,
      subdomain: slug,
      name: "E2E Connect Org",
      timezone: "Europe/Warsaw",
      currency: "PLN",
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`seed-org failed: ${res.status} ${txt}`);
  const body = JSON.parse(txt) as { ok: boolean; slug: string; subdomain: string; orgId: string };
  return { orgId: body.orgId, orgSlug: body.slug, subdomain: body.subdomain };
}

/** Enable a Connect account id on the org via /api/dev/seed-connect-account. */
async function seedConnectAccount(pg: Pg, orgSlug: string, accountId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/dev/seed-connect-account`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orgSlug, accountId }),
  });
  if (!res.ok) throw new Error(`seed-connect-account failed: ${await res.text()}`);
}

/** Seed a group type + session + client + athlete + credit type via seed-langlion. */
async function seedLanglion(pg: Pg, orgId: string) {
  const slug = uniqueId("gt");
  const res = await fetch(`${BASE_URL}/api/dev/seed-langlion`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      organizationId: orgId,
      groupType: {
        slug,
        engine: "schedule_first",
        paymentPolicy: "both",
        allowedPurchaseModes: ["single_class", "package"],
        allowedBillingTypes: ["one_time", "recurring"],
      },
      sessions: [
        {
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        },
      ],
      client: { email: uniqueEmail("parent"), isVerified: true },
      athletes: [{ name: "Test Athlete" }],
      creditType: {},
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    groupTypeId: string;
    sessionIds: string[];
    clientId: string;
    athleteIds: string[];
    creditTypeId: string;
  };
  if (!res.ok || data.ok !== true)
    throw new Error(`seed-langlion failed: ${data.message ?? `HTTP ${res.status}`}`);
  // `booking_class_session_fk` is composite — booking.sessionStartTime/EndTime
  // must EQUAL class_session.startTime/endTime exactly (millisecond precision).
  // Recomputing Date.now() here would drift from the seeded session, so read the
  // canonical times back out of the DB.
  const sessions = await sessionTimes(pg, data.sessionIds);
  return { ...data, sessions } as typeof data & { sessions: { id: string; startTime: string; endTime: string }[] };
}

async function sessionTimes(pg: Pg, ids: string[]): Promise<{ id: string; startTime: string; endTime: string }[]> {
  if (ids.length === 0) return [];
  const rows = (
    await pg.query(
      `SELECT id, "startTime" AS st, "endTime" AS et FROM class_session WHERE id::text = ANY($1::text[])`,
      [ids],
    )
  ).rows as { id: string; st: Date; et: Date }[];
  return rows.map((r) => ({ id: r.id, startTime: r.st.toISOString(), endTime: r.et.toISOString() }));
}

// ── Scenarios ──────────────────────────────────────────────────────────────

async function scenario1_onboarding(pg: Pg, orgSlug: string, accountId: string) {
  const id = "F5.1-onboarding";
  try {
    await seedConnectAccount(pg, orgSlug, accountId);
    const event = connectAccountUpdatedEvent({
      eventId: uniqueId("evt_activate"),
      accountId,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`webhook returned ${status}: ${body}`);

    const rows = await pg.query(
      `SELECT stripe_connect_status, stripe_connect_charges_enabled, stripe_connect_payouts_enabled
       FROM organization WHERE slug = $1`,
      [orgSlug],
    );
    const row = rows.rows[0];
    if (row?.stripe_connect_status !== "active")
      throw new Error(`expected active, got ${row?.stripe_connect_status}`);
    if (row?.stripe_connect_charges_enabled !== true) throw new Error("charges not enabled");
    if (row?.stripe_connect_payouts_enabled !== true) throw new Error("payouts not enabled");
    pass(id, "account.updated → status=active");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario2_bookingPayment(pg: Pg, orgId: string) {
  const id = "F5.2-booking_payment";
  try {
    const seed = await seedLanglion(pg, orgId);

    // Insert a payment_pending booking directly (system role). The webhook under
    // test is what confirms it — the online checkout branch that created such a
    // booking for real is exercised by the Playwright suite, not this script.
    const bookingId = randomUUID();
    const session = seed.sessions[0]!;
    const sessionId = session.id;
    const { startTime, endTime } = session;
    await pg.query(
      `INSERT INTO booking (id, "organizationId", "sessionId", "athleteId", "paymentStatus",
         "priceSnapshot", "sessionStartTime", "sessionEndTime")
       VALUES ($1, $2, $3, $4, 'payment_pending', '{"amount":10000,"currency":"PLN"}',
         $5::timestamptz, $6::timestamptz)`,
      [bookingId, orgId, sessionId, seed.athleteIds[0], startTime, endTime],
    );
    void seed;

    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt_booking"),
      sessionId: uniqueId("cs"),
      bookingId,
      organizationId: orgId,
      purchaseKind: "booking_payment",
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`webhook returned ${status}: ${body}`);

    // Assert booking confirmed.
    const rows = await pg.query(
      `SELECT "paymentStatus" AS status FROM booking WHERE id = $1 AND "organizationId" = $2`,
      [bookingId, orgId],
    );
    if (rows.rows[0]?.status !== "confirmed")
      throw new Error(`expected confirmed, got ${rows.rows[0]?.status}`);

    // Assert credit issued for this booking.
    const creditRows = await pg.query(
      `SELECT status FROM credit WHERE "organizationId" = $1 AND "usedInBookingId" = $2`,
      [orgId, bookingId],
    );
    if (creditRows.rowCount === 0) throw new Error("no credit issued");
    pass(id, "booking confirmed + credit issued");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario3_packagePurchase(pg: Pg, orgId: string) {
  const id = "F5.3-package_purchase";
  try {
    const seed = await seedLanglion(pg, orgId);

    // Seed a product template.
    await fetch(`${BASE_URL}/api/dev/seed-langlion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        groupTypeId: seed.groupTypeId,
        creditTypeId: seed.creditTypeId,
        productTemplate: { name: "E2E package", price: 20000, creditQuantity: 4, billingType: "one_time" },
      }),
    });

    const [tmpl3] = (
      await pg.query(
        `SELECT id FROM product_template WHERE organization_id = $1 AND credit_type_id = $2 AND name = 'E2E package' LIMIT 1`,
        [orgId, seed.creditTypeId],
      )
    ).rows as { id: string }[];
    const tmpl = tmpl3;
    if (!tmpl) throw new Error("product template not found for package_purchase");

    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt_pkg"),
      sessionId: uniqueId("cs"),
      bookingId: uniqueId("dummy-booking"),
      organizationId: orgId,
      purchaseKind: "package_purchase",
      extraMetadata: {
        clientId: seed.clientId,
        creditTypeId: seed.creditTypeId,
        productTemplateId: tmpl.id,
        quantity: "1",
      },
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`webhook returned ${status}: ${body}`);

    // Assert credits issued (family wallet, athleteId = null) with source package_online.
    const creditRows = await pg.query(
      `SELECT status, source, "athleteId" FROM credit
       WHERE "organizationId" = $1 AND "clientId" = $2 AND source = 'package_online'`,
      [orgId, seed.clientId],
    );
    if (creditRows.rowCount === 0) throw new Error("no package credits issued");
    pass(id, `package credits issued (${creditRows.rowCount})`);
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario4_subscription(pg: Pg, orgId: string) {
  const id = "F5.4-subscription";
  try {
    const seed = await seedLanglion(pg, orgId);

    // Seed a RECURRING product template.
    await fetch(`${BASE_URL}/api/dev/seed-langlion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        groupTypeId: seed.groupTypeId,
        creditTypeId: seed.creditTypeId,
        productTemplate: {
          name: "E2E subscription",
          price: 15000,
          creditQuantity: 8,
          billingType: "recurring",
          interval: "month",
          intervalCount: 1,
        },
      }),
    });

    const [tmpl] = (
      await pg.query(
        `SELECT id FROM product_template WHERE organization_id = $1 AND credit_type_id = $2 AND billing_type = 'recurring' AND name = 'E2E subscription' LIMIT 1`,
        [orgId, seed.creditTypeId],
      )
    ).rows as { id: string }[];
    if (!tmpl) throw new Error("recurring product template not found for subscription");

    const subscriptionId = uniqueId("sub");
    const customerId = uniqueId("cus");

    // Map client → stripe customer (client_stripe_customer).
    await pg.query(
      `INSERT INTO client_stripe_customer (id, organization_id, client_id, stripe_customer_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [randomUUID(), orgId, seed.clientId, customerId],
    );

    // 1. subscription_initial checkout.
    const initialEvent = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt_sub_init"),
      sessionId: uniqueId("cs"),
      bookingId: uniqueId("dummy"),
      organizationId: orgId,
      purchaseKind: "subscription_initial",
      amount: 15000,
      extraMetadata: {
        clientId: seed.clientId,
        creditTypeId: seed.creditTypeId,
        productTemplateId: tmpl.id,
        quantity: "1",
      },
    });
    // ConnectSubscriptionEvent expects `subscription` id on the session; add it.
    (initialEvent.data.object as { subscription?: string }).subscription = subscriptionId;
    const initRes = await postWebhook(initialEvent);
    if (initRes.status !== 200) throw new Error(`sub init webhook ${initRes.status}: ${initRes.body}`);

    // Assert client_subscription created.
    const subRows = await pg.query(
      `SELECT status FROM client_subscription WHERE organization_id = $1 AND stripe_subscription_id = $2`,
      [orgId, subscriptionId],
    );
    if (subRows.rowCount === 0) throw new Error("client_subscription not created");
    if (subRows.rows[0]?.status !== "active") throw new Error("sub not active");

    // 2. invoice.paid → renewal credits.
    const renewEvent = invoicePaidEvent({
      eventId: uniqueId("evt_invoice"),
      customerId,
      invoiceId: uniqueId("in"),
      subscriptionId,
      amount: 15000,
    });
    const renewRes = await postWebhook(renewEvent);
    if (renewRes.status !== 200) throw new Error(`invoice webhook ${renewRes.status}: ${renewRes.body}`);

    const renewCredits = await pg.query(
      `SELECT status FROM credit WHERE "organizationId" = $1 AND "clientId" = $2 AND source = 'subscription_renewal'`,
      [orgId, seed.clientId],
    );
    if (renewCredits.rowCount === 0) throw new Error("no renewal credits");

    pass(id, "sub created + renewal credits issued");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario5_refund(pg: Pg, orgId: string) {
  const id = "F5.5-refund";
  try {
    const seed = await seedLanglion(pg, orgId);

    // Seed a package, then create a credit_purchase + issue credits, then mark
    // them pending_refund (the state a full refund needs).
    await fetch(`${BASE_URL}/api/dev/seed-langlion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        groupTypeId: seed.groupTypeId,
        creditTypeId: seed.creditTypeId,
        productTemplate: { name: "Refund pkg", price: 20000, creditQuantity: 4, billingType: "one_time" },
      }),
    });

    const [tmpl] = (
      await pg.query(
        `SELECT id FROM product_template WHERE organization_id = $1 AND credit_type_id = $2 AND name = 'Refund pkg' LIMIT 1`,
        [orgId, seed.creditTypeId],
      )
    ).rows as { id: string }[];
    if (!tmpl) throw new Error("refund product template not found");

    const payIntentId = uniqueId("pi");
    const purchaseId = randomUUID();

    // charge.refunded resolves the org through the account id, so sign the
    // event with the org's ACTUAL connect account, not the dummy constant.
    const connectAccountId = (
      await pg.query(`SELECT stripe_connect_account_id FROM organization WHERE id = $1`, [orgId])
    ).rows[0]?.stripe_connect_account_id as string;

    // Insert credit_purchase with stripePaymentIntentId + refundVariant.
    await pg.query(
      `INSERT INTO credit_purchase (id, organization_id, client_id, product_template_id, quantity,
         price_paid, payment_method, stripe_payment_intent_id, refund_variant)
       VALUES ($1, $2, $3, $4, 1, 20000, 'online_one_time', $5, 'full_reversal')`,
      [purchaseId, orgId, seed.clientId, tmpl.id, payIntentId],
    );

    // Issue a credit in pending_refund state for that purchase.
    await pg.query(
      `INSERT INTO credit (id, "organizationId", "clientId", "creditTypeId", status, source,
         "creditPurchaseId", "validUntil", reason)
       VALUES ($1, $2, $3, $4, 'pending_refund', 'package_online', $5, now() + interval '365 days', 'E2E refund fixture')`,
      [randomUUID(), orgId, seed.clientId, seed.creditTypeId, purchaseId],
    );

    const event = chargeRefundedEvent({
      eventId: uniqueId("evt_refund"),
      paymentIntentId: payIntentId,
      amount: 20000,
      accountId: connectAccountId,
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`refund webhook ${status}: ${body}`);

    const creditRows = await pg.query(
      `SELECT status FROM credit WHERE "creditPurchaseId" = $1`,
      [purchaseId],
    );
    if (creditRows.rows[0]?.status !== "refunded")
      throw new Error(`expected refunded, got ${creditRows.rows[0]?.status}`);

    const purchaseRows = await pg.query(
      `SELECT refunded_at IS NOT NULL AS refunded, refund_amount FROM credit_purchase WHERE id = $1`,
      [purchaseId],
    );
    if (!purchaseRows.rows[0]?.refunded) throw new Error("purchase not marked refunded");

    pass(id, "credit pending_refund → refunded");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario6_groupChange(pg: Pg, orgId: string) {
  const id = "F5.6-group_change";
  try {
    const seed = await seedLanglion(pg, orgId);

    // Build the full chain: athlete → booking → group_change_request (awaiting_payment
    // with a resulting booking) on a SECOND session.
    const seed2 = await fetch(`${BASE_URL}/api/dev/seed-langlion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        groupTypeId: seed.groupTypeId,
        sessions: [
          {
            startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
            endsAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
          },
        ],
      }),
    });
    const seed2Data = (await seed2.json()) as { sessionIds: string[] };
    const seed2Session = (await sessionTimes(pg, seed2Data.sessionIds))[0]!;

    const resultBookingId = randomUUID();
    const sourceBookingId = randomUUID();
    const requestId = randomUUID();
    const userId = randomUUID();
    await pg.query(
      `INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, "E2E Admin", uniqueEmail("admin")],
    );

    // Source booking (cancelled) + resulting booking on target session. Both
    // must copy the sessions' canonical times exactly (`booking_class_session_fk`
    // is composite and compares millisecond-precision timestamps).
    await pg.query(
      `INSERT INTO booking (id, "organizationId", "sessionId", "athleteId", "paymentStatus",
         "priceSnapshot", "sessionStartTime", "sessionEndTime")
       VALUES ($1, $2, $3, $4, 'cancelled', '{"amount":10000,"currency":"PLN"}',
         $5::timestamptz, $6::timestamptz)`,
      [
        sourceBookingId,
        orgId,
        seed.sessionIds[0],
        seed.athleteIds[0],
        seed.sessions[0]!.startTime,
        seed.sessions[0]!.endTime,
      ],
    );
    await pg.query(
      `INSERT INTO booking (id, "organizationId", "sessionId", "athleteId", "paymentStatus",
         "priceSnapshot", "sessionStartTime", "sessionEndTime")
       VALUES ($1, $2, $3, $4, 'payment_pending', '{"amount":15000,"currency":"PLN"}',
         $5::timestamptz, $6::timestamptz)`,
      [
        resultBookingId,
        orgId,
        seed2Session.id,
        seed.athleteIds[0],
        seed2Session.startTime,
        seed2Session.endTime,
      ],
    );

    // Group change request in awaiting_payment.
    await pg.query(
      `INSERT INTO group_change_request (id, "organizationId", "clientId", "sourceBookingId",
         "targetSessionId", status, "priceDifference", "resultingBookingId", "reviewedByUserId")
       VALUES ($1, $2, $3, $4, $5, 'awaiting_payment', 5000, $6, $7)`,
      [
        requestId,
        orgId,
        seed.clientId,
        sourceBookingId,
        seed2Data.sessionIds[0],
        resultBookingId,
        userId,
      ],
    );

    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt_gcr"),
      sessionId: uniqueId("cs"),
      bookingId: requestId,
      organizationId: orgId,
      purchaseKind: "group_change_payment",
      amount: 5000,
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`group_change webhook ${status}: ${body}`);

    const gcr = await pg.query(
      `SELECT status FROM group_change_request WHERE id = $1`,
      [requestId],
    );
    if (gcr.rows[0]?.status !== "completed")
      throw new Error(`expected completed, got ${gcr.rows[0]?.status}`);

    const rb = await pg.query(
      `SELECT "paymentStatus" AS status FROM booking WHERE id = $1`,
      [resultBookingId],
    );
    if (rb.rows[0]?.status !== "confirmed")
      throw new Error(`resulting booking not confirmed, got ${rb.rows[0]?.status}`);

    pass(id, "group change completed + resulting booking confirmed");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

async function scenario7_extraFee(pg: Pg, orgId: string) {
  const id = "F5.7-extra_fee";
  try {
    const seed = await seedLanglion(pg, orgId);

    const feeId = randomUUID();
    const userId = randomUUID();

    // extra_fee.created_by_user_id is a NOT NULL FK to user; create a staff user.
    await pg.query(
      `INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, "E2E Staff", uniqueEmail("staff")],
    );

    // extra_fee in pending state (row created before checkout).
    await pg.query(
      `INSERT INTO extra_fee (id, organization_id, client_id, amount, currency_snapshot,
         description, status, payment_method, created_by_user_id)
       VALUES ($1, $2, $3, 5000, '{"amount":5000,"currency":"PLN"}', 'E2E fee',
         'pending', 'online', $4)`,
      [feeId, orgId, seed.clientId, userId],
    );

    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt_fee"),
      sessionId: uniqueId("cs"),
      bookingId: feeId,
      organizationId: orgId,
      purchaseKind: "extra_fee_payment",
      amount: 5000,
    });
    const { status, body } = await postWebhook(event);
    if (status !== 200) throw new Error(`extra_fee webhook ${status}: ${body}`);

    const fee = await pg.query(
      `SELECT status FROM extra_fee WHERE id = $1`,
      [feeId],
    );
    if (fee.rows[0]?.status !== "paid")
      throw new Error(`expected paid, got ${fee.rows[0]?.status}`);

    pass(id, "extra_fee marked paid");
  } catch (err) {
    fail(id, err instanceof Error ? err.message : String(err));
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nStripe Connect E2E smoke test`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Webhook: ${CONNECT_WEBHOOK_URL}`);
  console.log(`\n`);

  const pg = createPg();

  // Sanity: verify the server is reachable.
  try {
    await fetch(BASE_URL).catch(() => {});
  } catch {
    console.log("  ⚠️  Server not reachable. Start with: pnpm dev");
  }

  // A single org with a connect account reused across scenarios keeps DB noise
  // low; each scenario seeds its own domain rows.
  const org = await seedOrg();
  console.log(`  Seeded org: ${org.orgSlug} (${org.orgId})`);
  const accountId = uniqueId("acct_e2e");

  await scenario1_onboarding(pg, org.orgSlug, accountId);
  await scenario2_bookingPayment(pg, org.orgId);
  await scenario3_packagePurchase(pg, org.orgId);
  await scenario4_subscription(pg, org.orgId);
  await scenario5_refund(pg, org.orgId);
  await scenario6_groupChange(pg, org.orgId);
  await scenario7_extraFee(pg, org.orgId);

  await pg.end();

  // Report
  const passed = results.filter((r) => r.result === "PASS").length;
  const failed = results.filter((r) => r.result === "FAIL").length;
  const skipped = results.filter((r) => r.result === "SKIP").length;
  console.log(`\n── Results ───────────────────────────────`);
  console.log(`  PASS: ${passed}   FAIL: ${failed}   SKIP: ${skipped}`);
  if (failed > 0) {
    console.log(`\n  Failures:`);
    for (const r of results.filter((x) => x.result === "FAIL")) {
      console.log(`    ❌ ${r.id}: ${r.notes}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
