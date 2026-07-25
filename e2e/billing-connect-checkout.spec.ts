import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  connectAccountUpdatedEvent,
  connectCheckoutCompletedEvent,
  signedRequest,
  uniqueId,
  E2E_CONNECT_WEBHOOK_SECRET,
} from "./billing-fixtures";
import { registerViaApi, seedOrgFull, uniqueEmail } from "./helpers";

/**
 * Stripe Connect checkout E2E (Faza 11 / EPIK 5 — online single-class payment).
 *
 * Tests the webhook confirmation path for checkout.session.completed on a
 * Connected Account (direct charge). Runs fully offline via local HMAC.
 */

type Fixture = {
  orgId: string;
  orgSlug: string;
  orgSubdomain: string;
  clientId: string;
  athleteId: string;
  sessionId: string;
  creditTypeId: string;
  bookingId: string;
  connectAccountId: string;
};

/**
 * Seed an org with Connect active and a pending booking ready for online
 * checkout.
 */
async function seedPendingBooking(request: APIRequestContext): Promise<Fixture> {
  const ownerEmail = uniqueEmail("connect-checkout-owner");
  await registerViaApi(request, ownerEmail);
  const { slug: orgSlug, subdomain: orgSubdomain, orgId } = await seedOrgFull(request, {
    ownerEmail,
    slug: `org-${uniqueId("")}`,
  });

  const connectAccountId = uniqueId("acct_e2e");

  // Enable Connect on the org — seeds stripeConnectAccountId.
  const connectRes = await request.post("/api/dev/seed-connect-account", {
    data: { orgSlug, accountId: connectAccountId },
  });
  expect(connectRes.ok(), `seed-connect-account failed: ${await connectRes.text()}`).toBe(true);

  // Activate Connect via a signed account.updated webhook, so the org's
  // stripeConnectChargesEnabled is true (the gate for online payments).
  const activateEvent = connectAccountUpdatedEvent({
    eventId: uniqueId("evt_activate"),
    accountId: connectAccountId,
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
  });
  const actRes = await request.post(
    "/api/billing/connect/webhook",
    signedRequest(activateEvent, E2E_CONNECT_WEBHOOK_SECRET),
  );
  expect(actRes.ok(), `connect activation failed: ${await actRes.text()}`).toBe(true);

  // Seed langlion test data: group type with a session, credit type, client, athlete.
  const seedRes = await request.post("/api/dev/seed-langlion", {
    data: {
      organizationId: orgId,
      groupType: { slug: "online-class", paymentPolicy: "both", allowedPurchaseModes: ["single_class"] },
      creditType: {},
      client: { email: uniqueEmail("parent"), isVerified: true },
      athletes: [{ name: "Test Athlete" }],
      sessions: [
        {
          startsAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          endsAt: new Date(Date.now() + 86400000 + 3600000).toISOString(), // +1h
        },
      ],
    },
  });
  expect(seedRes.ok(), `seed-langlion failed: ${await seedRes.text()}`).toBe(true);
  const seedData = (await seedRes.json()) as {
    groupTypeId: string;
    sessionIds: string[];
    clientId: string;
    athleteIds: string[];
    creditTypeId: string;
  };

  // Create a payment_pending booking via the dev API.
  const bookingRes = await request.post("/api/dev/bookings", {
    data: {
      action: "create",
      organizationId: orgId,
      sessionId: seedData.sessionIds[0],
      clientId: seedData.clientId,
      athleteId: seedData.athleteIds[0],
      paymentMethod: "online",
      onlineAvailable: true,
    },
  });
  expect(bookingRes.ok(), `booking create failed: ${await bookingRes.text()}`).toBe(true);
  const bookingData = (await bookingRes.json()) as {
    ok: boolean;
    bookingId: string;
    paymentStatus: string;
    priceSnapshot: { amount: number; currency: string };
  };
  expect(bookingData.paymentStatus).toBe("payment_pending");

  return {
    orgId,
    orgSlug,
    orgSubdomain,
    clientId: seedData.clientId!,
    athleteId: seedData.athleteIds![0]!,
    sessionId: seedData.sessionIds![0]!,
    creditTypeId: seedData.creditTypeId,
    bookingId: bookingData.bookingId,
    connectAccountId,
  };
}

/**
 * Query the state of a booking in the test database.
 */
async function bookingState(
  request: APIRequestContext,
  orgId: string,
  sessionId: string,
): Promise<{
  id: string;
  paymentStatus: string;
  consumedCreditId: string | null;
  priceSnapshot: { amount: number; currency: string };
}> {
  const res = await request.post("/api/dev/bookings", {
    data: {
      action: "state",
      organizationId: orgId,
      sessionId,
    },
  });
  expect(res.ok(), `booking state failed: ${await res.text()}`).toBe(true);
  const body = (await res.json()) as {
    activeBookings: number;
    bookings: {
      id: string;
      athleteId: string;
      paymentStatus: string;
      priceSnapshot: { amount: number; currency: string };
      attendanceStatus: string | null;
      consumedCreditId: string | null;
    }[];
  };
  expect(body.bookings.length).toBeGreaterThan(0);
  return body.bookings[0]!;
}

/**
 * Query the credits for a client.
 */
async function clientCredits(
  request: APIRequestContext,
  orgId: string,
  clientId: string,
): Promise<{ id: string; status: string; source: string; usedInBookingId: string | null }[]> {
  const res = await request.get(
    `/api/dev/credits?organizationId=${encodeURIComponent(orgId)}&clientId=${encodeURIComponent(clientId)}`,
  );
  expect(res.ok(), `credits query failed: ${await res.text()}`).toBe(true);
  const body = (await res.json()) as {
    credits: { id: string; status: string; source: string; usedInBookingId: string | null }[];
  };
  return body.credits;
}

test.describe("Connect checkout webhook (F11 / EPIK 5)", () => {
  let fix: Fixture;

  test.beforeEach(async ({ request }) => {
    fix = await seedPendingBooking(request);
  });

  test("happy path: checkout.session.completed confirms booking and issues+consumes credit", async ({
    request,
  }) => {
    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt"),
      sessionId: uniqueId("cs_"),
      bookingId: fix.bookingId,
      organizationId: fix.orgId,
      accountId: fix.connectAccountId,
    });

    const res = await request.post(
      "/api/billing/connect/webhook",
      signedRequest(event, E2E_CONNECT_WEBHOOK_SECRET),
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe("processed");

    // Booking should be confirmed.
    const state = await bookingState(request, fix.orgId, fix.sessionId);
    expect(state.paymentStatus).toBe("confirmed");

    // A credit should exist with source=online_payment, status=used.
    const credits = await clientCredits(request, fix.orgId, fix.clientId);
    const onlineCredit = credits.find((c) => c.source === "online_payment");
    expect(onlineCredit).toBeDefined();
    expect(onlineCredit!.status).toBe("used");
    expect(onlineCredit!.usedInBookingId).toBe(fix.bookingId);
  });

  test("AC3: online_payment credit never appears as available in wallet", async ({
    request,
  }) => {
    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt"),
      sessionId: uniqueId("cs_"),
      bookingId: fix.bookingId,
      organizationId: fix.orgId,
      accountId: fix.connectAccountId,
    });

    await request.post(
      "/api/billing/connect/webhook",
      signedRequest(event, E2E_CONNECT_WEBHOOK_SECRET),
    );

    const credits = await clientCredits(request, fix.orgId, fix.clientId);
    const availableOnlineCredits = credits.filter(
      (c) => c.source === "online_payment" && c.status === "available",
    );
    expect(availableOnlineCredits.length).toBe(0);
  });

  test("idempotency: double delivery does not duplicate the credit", async ({
    request,
  }) => {
    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt"),
      sessionId: uniqueId("cs_"),
      bookingId: fix.bookingId,
      organizationId: fix.orgId,
      accountId: fix.connectAccountId,
    });
    const signedEvt = signedRequest(event, E2E_CONNECT_WEBHOOK_SECRET);

    // First delivery.
    const res1 = await request.post("/api/billing/connect/webhook", signedEvt);
    expect(res1.ok()).toBe(true);
    expect((await res1.json()).status).toBe("processed");

    // Second delivery — should be idempotent.
    const res2 = await request.post("/api/billing/connect/webhook", signedEvt);
    expect(res2.ok()).toBe(true);
    expect((await res2.json()).status).toBe("duplicate");

    // Only one credit should exist.
    const credits = await clientCredits(request, fix.orgId, fix.clientId);
    const onlineCredits = credits.filter((c) => c.source === "online_payment");
    expect(onlineCredits.length).toBe(1);
  });

  test("payment_status=unpaid leaves booking as payment_pending", async ({
    request,
  }) => {
    const event = connectCheckoutCompletedEvent({
      eventId: uniqueId("evt"),
      sessionId: uniqueId("cs_"),
      bookingId: fix.bookingId,
      organizationId: fix.orgId,
      accountId: fix.connectAccountId,
      paymentStatus: "unpaid",
    });

    const res = await request.post(
      "/api/billing/connect/webhook",
      signedRequest(event, E2E_CONNECT_WEBHOOK_SECRET),
    );
    expect(res.ok()).toBe(true);

    // Booking should still be payment_pending.
    const state = await bookingState(request, fix.orgId, fix.sessionId);
    expect(state.paymentStatus).toBe("payment_pending");

    // No credit should have been created.
    const credits = await clientCredits(request, fix.orgId, fix.clientId);
    const onlineCredits = credits.filter((c) => c.source === "online_payment");
    expect(onlineCredits.length).toBe(0);
  });
});
