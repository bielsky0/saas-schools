import { expect, test } from "@playwright/test";

import {
  drainJobs,
  getEmails,
  loginToAcademy,
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  uniqueNearFutureSlot,
} from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Package purchase — reception desk (langlion §2.13, EPIK 9/10, F12b).
 *
 * Tests the cash package purchase flow: reception sells a package at the desk,
 * credits are issued, and auto-fill settles overdue booked_offline bookings
 * and fills upcoming sessions.
 */

async function creditState(
  request: Parameters<typeof seedOrgFull>[0],
  organizationId: string,
  clientId: string,
) {
  const res = await request.get(
    `/api/dev/credits?organizationId=${organizationId}&clientId=${clientId}`,
  );
  return (await res.json()) as {
    availableBalance: number;
    credits: { id: string; status: string; source: string }[];
  };
}

test("reception sells a package — credits are issued and auto-filled", async ({
  page,
  request,
}) => {
  const ownerEmail = uniqueEmail("pkg-owner");
  await registerViaApi(request, ownerEmail);
  const receptionEmail = uniqueEmail("pkg-reception");
  await registerViaApi(request, receptionEmail);

  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: "Package Academy",
    slug: uniqueId("pkg"),
    subdomain: uniqueSubdomain("pkg"),
    members: [{ email: receptionEmail, role: "reception" }],
  });

  const slot = uniqueNearFutureSlot();
  // Seed: offer + credit type + client + athlete + sessions + product template
  // Also create a booked_offline booking on session 0 to test settlement.
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("pkg-offer").replace(/_/g, "-"),
      name: "Package offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [
      { startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 },
      {
        startsAt: new Date(Date.now() + 172800000).toISOString(), // +2 days
        endsAt: new Date(Date.now() + 173160000).toISOString(), // +2d+1h
        capacity: 8,
      },
    ],
    client: { email: uniqueEmail("pkg-parent"), isVerified: true },
    athletes: [{ name: "Package Kid" }],
    bookings: [{ sessionIndex: 0, athleteIndex: 0, paymentStatus: "booked_offline" }],
    creditType: { name: "Package offer credits" },
    productTemplate: {
      name: "4-class pack",
      creditQuantity: 4,
      price: 15000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  await loginToAcademy(page, subdomain, receptionEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/purchases"));

  // Select the package (contains "4-class pack")
  await page.getByRole("combobox", { name: "Package" }).click();
  await page.getByRole("option", { name: /4-class pack/ }).click();

  // Select the client (first option after placeholder, index 1)
  await page.getByRole("combobox", { name: "Client" }).click();
  await page.getByRole("option").first().click();

  // Submit
  await page.getByRole("button", { name: "Sell package" }).click();

  // Verify success message
  await expect(page.getByText(/Package sold/)).toBeVisible();

  // Verify credits were issued
  const credits = await creditState(request, orgId, seed.clientId!);
  expect(credits.availableBalance).toBeGreaterThanOrEqual(1);
});

test("cash purchase page is not visible without permission", async ({
  page,
  request,
}) => {
  const ownerEmail = uniqueEmail("pkg-norole-owner");
  await registerViaApi(request, ownerEmail);
  const trainerEmail = uniqueEmail("pkg-trainer");
  await registerViaApi(request, trainerEmail);

  const { subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: "No Role Academy",
    slug: uniqueId("pkg-norole"),
    subdomain: uniqueSubdomain("pkg-norole"),
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  await loginToAcademy(page, subdomain, trainerEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/purchases"));

  // Trainer does not have credits.purchase_cash — expect 403
  await expect(page.getByText("Access denied")).toBeVisible();
});

test("concurrent purchases on the same session — one books, the other skips", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("conc-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Concurrent Academy",
    slug: uniqueId("conc"),
    subdomain: uniqueSubdomain("conc"),
  });

  const slot = uniqueNearFutureSlot();

  // Seed group type, credit type, product template, and one session with capacity=1.
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("conc-offer").replace(/_/g, "-"),
      name: "Concurrent offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 1 }],
    creditType: { name: "Concurrent credits" },
    productTemplate: {
      name: "2-class pack",
      creditQuantity: 2,
      price: 5000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  // Create two separate clients, each with an athlete.
  const client1 = await seedLanglion(request, {
    organizationId: orgId,
    groupTypeId: seed.groupTypeId!,
    client: { email: uniqueEmail("conc-parent1"), isVerified: true },
    athletes: [{ name: "Kid 1" }],
  });
  expect(client1.ok, `client1 seed failed: ${client1.message}`).toBe(true);

  const client2 = await seedLanglion(request, {
    organizationId: orgId,
    groupTypeId: seed.groupTypeId!,
    client: { email: uniqueEmail("conc-parent2"), isVerified: true },
    athletes: [{ name: "Kid 2" }],
  });
  expect(client2.ok, `client2 seed failed: ${client2.message}`).toBe(true);

  // Fire both purchases in parallel via the dev API.
  const [r1, r2] = await Promise.all([
    request.post("/api/dev/purchases", {
      data: {
        organizationId: orgId,
        clientId: client1.clientId!,
        productTemplateId: seed.productTemplateId!,
        athleteId: client1.athleteIds![0]!,
      },
    }),
    request.post("/api/dev/purchases", {
      data: {
        organizationId: orgId,
        clientId: client2.clientId!,
        productTemplateId: seed.productTemplateId!,
        athleteId: client2.athleteIds![0]!,
      },
    }),
  ]);

  const j1 = (await r1.json()) as { ok: boolean; filled: number; skipped: number; creditsIssued: number };
  const j2 = (await r2.json()) as { ok: boolean; filled: number; skipped: number; creditsIssued: number };

  // Both purchases themselves should succeed (credits issued).
  expect(j1.ok, `p1 failed: ${JSON.stringify(j1)}`).toBe(true);
  expect(j2.ok, `p2 failed: ${JSON.stringify(j2)}`).toBe(true);

  // One booking succeeds (capacity=1), the other is skipped.
  expect(j1.filled + j2.filled).toBe(1);
  expect(j1.skipped + j2.skipped).toBe(1);

  // Both clients should have credits — the skipped client has all 2 unused,
  // the booked client has 1 remaining (1 spent on the session).
  // Total: 4 issued, 1 spent = 3 available.
  const c1 = await creditState(request, orgId, client1.clientId!);
  const c2 = await creditState(request, orgId, client2.clientId!);
  expect(c1.availableBalance + c2.availableBalance).toBe(3);

  // Verify exactly one booking on the session (capacity=1).
  const state = await request
    .post("/api/dev/bookings", {
      data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![0]! },
    })
    .then((r) => r.json()) as { activeBookings: number };
  expect(state.activeBookings).toBe(1);
});

/**
 * Online package purchase — webhook → credits → auto-fill (F12c).
 *
 * Tests the webhook handler for package_purchase events: credits are issued
 * to the family wallet, auto-fill settles booked_offline and fills upcoming
 * sessions. No Stripe involved — the dev API simulates the webhook.
 */

test("online package purchase — credits issued and auto-filled", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("onpkg-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Online Pkg Academy",
    slug: uniqueId("onpkg"),
    subdomain: uniqueSubdomain("onpkg"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("onpkg-offer").replace(/_/g, "-"),
      name: "Online pkg offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [
      { startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 },
      {
        startsAt: new Date(Date.now() + 172800000).toISOString(),
        endsAt: new Date(Date.now() + 173160000).toISOString(),
        capacity: 8,
      },
    ],
    client: { email: uniqueEmail("onpkg-parent"), isVerified: true },
    athletes: [{ name: "Online Kid" }],
    bookings: [{ sessionIndex: 0, athleteIndex: 0, paymentStatus: "booked_offline" }],
    creditType: { name: "Online pkg credits" },
    productTemplate: {
      name: "Online 4-pack",
      creditQuantity: 4,
      price: 15000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const res = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
    },
  });
  const body = (await res.json()) as { ok: boolean; status: string };
  expect(body.ok, `webhook failed: ${JSON.stringify(body)}`).toBe(true);
  expect(body.status).toBe("processed");

  const credits = await creditState(request, orgId, seed.clientId!);
  // 4 issued, 2 consumed (1 settled + 1 future), 2 remain.
  expect(credits.availableBalance).toBeGreaterThanOrEqual(2);

  // Verify bookings exist on both sessions.
  const state0 = await request
    .post("/api/dev/bookings", {
      data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![0]! },
    })
    .then((r) => r.json()) as { activeBookings: number };
  expect(state0.activeBookings).toBe(1);

  const state1 = await request
    .post("/api/dev/bookings", {
      data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![1]! },
    })
    .then((r) => r.json()) as { activeBookings: number };
  expect(state1.activeBookings).toBe(1);
});

test("online package purchase — duplicate webhook is idempotent", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("idem-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Idempotent Academy",
    slug: uniqueId("idem"),
    subdomain: uniqueSubdomain("idem"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("idem-offer").replace(/_/g, "-"),
      name: "Idempotent offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [
      { startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 },
    ],
    client: { email: uniqueEmail("idem-parent"), isVerified: true },
    athletes: [{ name: "Idem Kid" }],
    creditType: { name: "Idem credits" },
    productTemplate: {
      name: "Idem 3-pack",
      creditQuantity: 3,
      price: 9000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const eventId = `evt_dup_${crypto.randomUUID()}`;
  const payload = {
    organizationId: orgId,
    clientId: seed.clientId!,
    creditTypeId: seed.creditTypeId!,
    productTemplateId: seed.productTemplateId!,
    quantity: 3,
    eventId,
  };

  const r1 = await request.post("/api/dev/package-webhook", { data: payload });
  const b1 = (await r1.json()) as { ok: boolean; status: string };
  expect(b1.ok).toBe(true);
  expect(b1.status).toBe("processed");

  const credits1 = await creditState(request, orgId, seed.clientId!);
  const total1 = credits1.credits.length;

  const r2 = await request.post("/api/dev/package-webhook", { data: payload });
  const b2 = (await r2.json()) as { ok: boolean; status: string };
  expect(b2.ok).toBe(true);
  expect(b2.status).toBe("duplicate");

  const credits2 = await creditState(request, orgId, seed.clientId!);
  expect(credits2.credits.length).toBe(total1);
});

test("online package purchase — two clients, capacity=1, one skips", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("race-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Race Academy",
    slug: uniqueId("race"),
    subdomain: uniqueSubdomain("race"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("race-offer").replace(/_/g, "-"),
      name: "Race offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 1 }],
    creditType: { name: "Race credits" },
    productTemplate: {
      name: "Race 2-pack",
      creditQuantity: 2,
      price: 5000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const client1 = await seedLanglion(request, {
    organizationId: orgId,
    groupTypeId: seed.groupTypeId!,
    client: { email: uniqueEmail("race-p1"), isVerified: true },
    athletes: [{ name: "Racer 1" }],
  });
  expect(client1.ok).toBe(true);

  const client2 = await seedLanglion(request, {
    organizationId: orgId,
    groupTypeId: seed.groupTypeId!,
    client: { email: uniqueEmail("race-p2"), isVerified: true },
    athletes: [{ name: "Racer 2" }],
  });
  expect(client2.ok).toBe(true);

  const pkgPayload = (clientId: string) => ({
    organizationId: orgId,
    clientId,
    creditTypeId: seed.creditTypeId!,
    productTemplateId: seed.productTemplateId!,
    quantity: 2,
  });

  const [r1, r2] = await Promise.all([
    request.post("/api/dev/package-webhook", { data: pkgPayload(client1.clientId!) }),
    request.post("/api/dev/package-webhook", { data: pkgPayload(client2.clientId!) }),
  ]);

  const j1 = (await r1.json()) as { ok: boolean; status: string };
  const j2 = (await r2.json()) as { ok: boolean; status: string };
  expect(j1.ok).toBe(true);
  expect(j2.ok).toBe(true);

  const c1 = await creditState(request, orgId, client1.clientId!);
  const c2 = await creditState(request, orgId, client2.clientId!);
  // 4 credits issued total, 1 spent = 3 available.
  expect(c1.availableBalance + c2.availableBalance).toBe(3);

  const state = await request
    .post("/api/dev/bookings", {
      data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![0]! },
    })
    .then((r) => r.json()) as { activeBookings: number };
  expect(state.activeBookings).toBe(1);
});

/**
 * Subscription checkout — webhook handlers (F12d).
 *
 * Tests the subscription lifecycle: checkout.session.completed creates
 * client_subscription, invoice.paid issues credits and auto-fills,
 * invoice.payment_failed marks past_due, and customer.subscription.deleted
 * marks canceled. All via dev API — no Stripe involved.
 */

const SUBSCRIPTION_CUSTOMER_ID = "cus_sim_sub_test";

test("subscription — full happy path: subscription_initial → invoice.paid → credits → auto-fill", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-happy-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Happy Academy",
    slug: uniqueId("sub-happy"),
    subdomain: uniqueSubdomain("sub-happy"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-happy-offer").replace(/_/g, "-"),
      name: "Sub happy offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [
      { startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 },
      {
        startsAt: new Date(Date.now() + 172800000).toISOString(),
        endsAt: new Date(Date.now() + 173160000).toISOString(),
        capacity: 8,
      },
    ],
    client: { email: uniqueEmail("sub-happy-parent"), isVerified: true },
    athletes: [{ name: "Sub Kid" }],
    bookings: [{ sessionIndex: 0, athleteIndex: 0, paymentStatus: "booked_offline" }],
    creditType: { name: "Sub happy credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_happy_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_happy`;

  // Create client_stripe_customer mapping.
  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Step 1: subscription_initial (checkout.session.completed).
  const r1 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });
  const b1 = (await r1.json()) as { ok: boolean; status: string };
  expect(b1.ok).toBe(true);
  expect(b1.status).toBe("processed");

  // Step 2: invoice.paid → credits → auto-fill.
  const r2 = await request.post("/api/dev/subscription-invoice", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
    },
  });
  const b2 = (await r2.json()) as { ok: boolean; status: string };
  expect(b2.ok).toBe(true);
  expect(b2.status).toBe("processed");

  // Verify credits were issued.
  const credits = await creditState(request, orgId, seed.clientId!);
  // 4 issued, 2 consumed (1 settled + 1 future), 2 remain.
  expect(credits.availableBalance).toBeGreaterThanOrEqual(2);
});

test("subscription — duplicate invoice.paid is idempotent", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-idem-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Idem Academy",
    slug: uniqueId("sub-idem"),
    subdomain: uniqueSubdomain("sub-idem"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-idem-offer").replace(/_/g, "-"),
      name: "Sub idem offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("sub-idem-parent"), isVerified: true },
    athletes: [{ name: "Sub Idem Kid" }],
    creditType: { name: "Sub idem credits" },
    productTemplate: {
      name: "Monthly 3-pack",
      creditQuantity: 3,
      price: 9000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_idem_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_idem`;

  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Create subscription first.
  await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 3,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });

  const eventId = `evt_sub_idem_${crypto.randomUUID()}`;
  const payload = {
    stripeSubscriptionId: subsId,
    stripeCustomerId: customerId,
    eventId,
  };

  const r1 = await request.post("/api/dev/subscription-invoice", { data: payload });
  const b1 = (await r1.json()) as { ok: boolean; status: string };
  expect(b1.ok).toBe(true);
  expect(b1.status).toBe("processed");

  const credits1 = await creditState(request, orgId, seed.clientId!);
  const total1 = credits1.credits.length;

  const r2 = await request.post("/api/dev/subscription-invoice", { data: payload });
  const b2 = (await r2.json()) as { ok: boolean; status: string };
  expect(b2.ok).toBe(true);
  expect(b2.status).toBe("duplicate");

  const credits2 = await creditState(request, orgId, seed.clientId!);
  expect(credits2.credits.length).toBe(total1);
});

test("subscription — second purchase, same client → client_stripe_customer not duplicated", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-dupcs-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub DupCS Academy",
    slug: uniqueId("sub-dupcs"),
    subdomain: uniqueSubdomain("sub-dupcs"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-dupcs-offer").replace(/_/g, "-"),
      name: "Sub dupCS offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("sub-dupcs-parent"), isVerified: true },
    athletes: [{ name: "Sub DupCS Kid" }],
    creditType: { name: "Sub dupCS credits" },
    productTemplate: {
      name: "Monthly 2-pack",
      creditQuantity: 2,
      price: 5000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_dupcs`;

  // Create client_stripe_customer once.
  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Two subscription initial events — same client, different subscription ids.
  const sub1Id = `sub_sim_dupcs_1_${crypto.randomUUID()}`;
  const sub2Id = `sub_sim_dupcs_2_${crypto.randomUUID()}`;

  const r1 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 2,
      purchaseKind: "subscription_initial",
      subscriptionId: sub1Id,
    },
  });
  expect((await r1.json()).status).toBe("processed");

  const r2 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 2,
      purchaseKind: "subscription_initial",
      subscriptionId: sub2Id,
    },
  });
  expect((await r2.json()).status).toBe("processed");

  // Both invoices should work with the same customer.
  const i1 = await request.post("/api/dev/subscription-invoice", {
    data: { stripeSubscriptionId: sub1Id, stripeCustomerId: customerId },
  });
  expect((await i1.json()).status).toBe("processed");

  const i2 = await request.post("/api/dev/subscription-invoice", {
    data: { stripeSubscriptionId: sub2Id, stripeCustomerId: customerId },
  });
  expect((await i2.json()).status).toBe("processed");

  const credits = await creditState(request, orgId, seed.clientId!);
  // 2 + 2 = 4 credits total.
  expect(credits.credits.length).toBe(4);
});

test("subscription — isolated checkout.session.completed creates client_subscription, no credits", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-iso-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Iso Academy",
    slug: uniqueId("sub-iso"),
    subdomain: uniqueSubdomain("sub-iso"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-iso-offer").replace(/_/g, "-"),
      name: "Sub iso offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("sub-iso-parent"), isVerified: true },
    athletes: [{ name: "Sub Iso Kid" }],
    creditType: { name: "Sub iso credits" },
    productTemplate: {
      name: "Monthly 2-pack",
      creditQuantity: 2,
      price: 5000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_iso_${crypto.randomUUID()}`;

  // Fire ONLY subscription_initial — no invoice.paid.
  const r = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 2,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });
  const b = (await r.json()) as { ok: boolean; status: string };
  expect(b.ok).toBe(true);
  expect(b.status).toBe("processed");

  // No credits should have been issued — credits come from invoice.paid.
  const credits = await creditState(request, orgId, seed.clientId!);
  expect(credits.credits.length).toBe(0);
});

test("subscription — reversed order: invoice.paid before checkout.session.completed", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-rev-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Rev Academy",
    slug: uniqueId("sub-rev"),
    subdomain: uniqueSubdomain("sub-rev"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-rev-offer").replace(/_/g, "-"),
      name: "Sub rev offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("sub-rev-parent"), isVerified: true },
    athletes: [{ name: "Sub Rev Kid" }],
    creditType: { name: "Sub rev credits" },
    productTemplate: {
      name: "Monthly 3-pack",
      creditQuantity: 3,
      price: 9000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_rev_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_rev`;

  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // invoice.paid FIRST (reversed order) — no subscription row exists yet.
  const r1 = await request.post("/api/dev/subscription-invoice", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
      eventId: `evt_rev_inv_${crypto.randomUUID()}`,
    },
  });
  const b1 = (await r1.json()) as { ok: boolean; status: string };
  expect(b1.ok).toBe(true);
  // Stripe will retry: by the time the retry arrives, the subscription exists.
  expect(b1.status).toBe("unknown_account");
  const creditsBefore = await creditState(request, orgId, seed.clientId!);
  expect(creditsBefore.credits.length).toBe(0);

  // Then checkout.session.completed creates the subscription.
  const r2 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 3,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
      eventId: `evt_rev_checkout_${crypto.randomUUID()}`,
    },
  });
  const b2 = (await r2.json()) as { ok: boolean; status: string };
  expect(b2.ok).toBe(true);
  expect(b2.status).toBe("processed");

  // Now re-send invoice.paid — the subscription exists, credits are issued.
  const r3 = await request.post("/api/dev/subscription-invoice", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
      eventId: `evt_rev_inv_retry_${crypto.randomUUID()}`,
    },
  });
  const b3 = (await r3.json()) as { ok: boolean; status: string };
  expect(b3.ok).toBe(true);
  expect(b3.status).toBe("processed");

  // Credits are issued exactly once.
  const creditsAfter = await creditState(request, orgId, seed.clientId!);
  expect(creditsAfter.credits.length).toBe(3);
});

test("subscription — invoice.payment_failed marks past_due and sends email", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-fail-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Fail Academy",
    slug: uniqueId("sub-fail"),
    subdomain: uniqueSubdomain("sub-fail"),
  });

  const parentEmail = uniqueEmail("sub-fail-parent");
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-fail-offer").replace(/_/g, "-"),
      name: "Sub fail offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [],
    client: { email: parentEmail, isVerified: true },
    athletes: [],
    creditType: { name: "Sub fail credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_fail_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_fail`;

  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Create subscription first so it exists for status update.
  await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });

  const r = await request.post("/api/dev/subscription-failed", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
    },
  });
  const b = (await r.json()) as { ok: boolean; status: string };
  expect(b.ok).toBe(true);
  expect(b.status).toBe("processed");

  // Drain job queue so the email.send job renders into the outbox.
  await drainJobs(request);

  // Verify email was queued.
  const emails = await getEmails(request, parentEmail);
  const subEmail = emails.find((e) => e.template === "subscription-payment-failed");
  expect(subEmail).toBeDefined();
  expect(subEmail!.to).toBe(parentEmail);
});

test("subscription — invoice.payment_failed with portalConfigured=false sends email without link", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-noport-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub NoPort Academy",
    slug: uniqueId("sub-noport"),
    subdomain: uniqueSubdomain("sub-noport"),
  });
  // portalConfigured defaults to false — no action needed.

  const parentEmail = uniqueEmail("sub-noport-parent");
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-noport-offer").replace(/_/g, "-"),
      name: "Sub noport offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [],
    client: { email: parentEmail, isVerified: true },
    athletes: [],
    creditType: { name: "Sub noport credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_noport_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_noport`;

  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Create subscription first.
  await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });

  const r = await request.post("/api/dev/subscription-failed", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
    },
  });
  const b = (await r.json()) as { ok: boolean; status: string };
  expect(b.ok).toBe(true);
  expect(b.status).toBe("processed");

  // Drain job queue so the email.send job renders into the outbox.
  await drainJobs(request);

  // Verify email was queued.
  const emails = await getEmails(request, parentEmail);
  const subEmail = emails.find((e) => e.template === "subscription-payment-failed");
  expect(subEmail).toBeDefined();
  expect(subEmail!.to).toBe(parentEmail);
});

test("subscription — customer.subscription.deleted marks canceled", async ({
  request,
}) => {
  const ownerEmail = uniqueEmail("sub-cancel-owner");
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Sub Cancel Academy",
    slug: uniqueId("sub-cancel"),
    subdomain: uniqueSubdomain("sub-cancel"),
  });

  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("sub-cancel-offer").replace(/_/g, "-"),
      name: "Sub cancel offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [],
    client: { email: uniqueEmail("sub-cancel-parent"), isVerified: true },
    athletes: [],
    creditType: { name: "Sub cancel credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_cancel_${crypto.randomUUID()}`;
  const customerId = `${SUBSCRIPTION_CUSTOMER_ID}_cancel`;

  await request.post("/api/dev/client-stripe-customer", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      stripeCustomerId: customerId,
    },
  });

  // Create subscription first.
  await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });

  const r = await request.post("/api/dev/subscription-deleted", {
    data: {
      stripeSubscriptionId: subsId,
      stripeCustomerId: customerId,
    },
  });
  const b = (await r.json()) as { ok: boolean; status: string };
  expect(b.ok).toBe(true);
  expect(b.status).toBe("processed");
});

// ── Podfaza (e) — Nieretroaktywność zmian polityki ────────────────────

test("US-23.4/AC1 — no_packages_available when package mode enabled but no active templates", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("e-nopkg");
  await registerViaApi(request, email);
  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail: email,
    name: "NoPkg Academy",
    slug: uniqueId("no-pkg"),
    subdomain: uniqueSubdomain("no-pkg"),
  });

  const offerSlug = uniqueId("no-pkg-offer").replace(/_/g, "-");
  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: offerSlug,
      name: "No package offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("e-nopkg-parent"), isVerified: true },
    athletes: [{ name: "NoPkg Kid" }],
    creditType: { name: "NoPkg credits" },
    // No productTemplate → no active packages.
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  // Visit the enrollment page — should see the no_packages_available message.
  await page.goto(tenantUrl(subdomain, `/en/zapisy/${offerSlug}`));
  await expect(
    page.getByText("No packages are currently available"),
  ).toBeVisible();
});

test("US-23.6/AC1 — subscription renewal works without recurring in allowedBillingTypes", async ({
  request,
}) => {
  const email = uniqueEmail("e-ac1");
  await registerViaApi(request, email);
  const { orgId } = await seedOrgFull(request, {
    ownerEmail: email,
    name: "AC1 Academy",
    slug: uniqueId("ac1"),
    subdomain: uniqueSubdomain("ac1"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("ac1-offer").replace(/_/g, "-"),
      name: "AC1 offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["one_time"], // No recurring — but webhook ignores this.
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("ac1-parent"), isVerified: true },
    athletes: [{ name: "AC1 Kid" }],
    creditType: { name: "AC1 credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_ac1_${crypto.randomUUID()}`;
  const customerId = `cus_ac1_${crypto.randomUUID()}`;

  await request.post("/api/dev/client-stripe-customer", {
    data: { organizationId: orgId, clientId: seed.clientId!, stripeCustomerId: customerId },
  });

  // Create subscription.
  const r1 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });
  expect(((await r1.json()) as { ok: boolean }).ok).toBe(true);

  // invoice.paid → should issue credits despite no recurring in allowedBillingTypes.
  const r2 = await request.post("/api/dev/subscription-invoice", {
    data: { stripeSubscriptionId: subsId, stripeCustomerId: customerId },
  });
  expect(((await r2.json()) as { ok: boolean }).ok).toBe(true);

  const credits = await creditState(request, orgId, seed.clientId!);
  expect(credits.availableBalance).toBeGreaterThanOrEqual(1);
});

test("AC7 — deactivated template still renews subscription (invoice.paid ignores is_active)", async ({
  request,
}) => {
  const email = uniqueEmail("e-ac7");
  await registerViaApi(request, email);
  const { orgId } = await seedOrgFull(request, {
    ownerEmail: email,
    name: "AC7 Academy",
    slug: uniqueId("ac7"),
    subdomain: uniqueSubdomain("ac7"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("ac7-offer").replace(/_/g, "-"),
      name: "AC7 offer",
      price: 10_000,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("ac7-parent"), isVerified: true },
    athletes: [{ name: "AC7 Kid" }],
    creditType: { name: "AC7 credits" },
    productTemplate: {
      name: "Monthly 4-pack",
      creditQuantity: 4,
      price: 15000,
      billingType: "recurring",
      interval: "month",
      intervalCount: 1,
      isActive: false, // Template is deactivated.
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const subsId = `sub_sim_ac7_${crypto.randomUUID()}`;
  const customerId = `cus_ac7_${crypto.randomUUID()}`;

  await request.post("/api/dev/client-stripe-customer", {
    data: { organizationId: orgId, clientId: seed.clientId!, stripeCustomerId: customerId },
  });

  // Create subscription (checkout action would block due to !isActive, but webhook doesn't).
  const r1 = await request.post("/api/dev/package-webhook", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      creditTypeId: seed.creditTypeId!,
      productTemplateId: seed.productTemplateId!,
      quantity: 4,
      purchaseKind: "subscription_initial",
      subscriptionId: subsId,
    },
  });
  const r1b = (await r1.json()) as { ok: boolean };
  expect(r1b.ok).toBe(true);

  // invoice.paid → should issue credits despite template being inactive.
  const r2 = await request.post("/api/dev/subscription-invoice", {
    data: { stripeSubscriptionId: subsId, stripeCustomerId: customerId },
  });
  const r2b = (await r2.json()) as { ok: boolean };
  expect(r2b.ok).toBe(true);

  const credits = await creditState(request, orgId, seed.clientId!);
  expect(credits.availableBalance).toBeGreaterThanOrEqual(1);
});

test("US-23.5/AC1 — changing group type policy does not affect existing booking price_snapshot", async ({
  request,
}) => {
  const email = uniqueEmail("e-ac5");
  await registerViaApi(request, email);
  const { orgId } = await seedOrgFull(request, {
    ownerEmail: email,
    name: "AC5 Academy",
    slug: uniqueId("ac5"),
    subdomain: uniqueSubdomain("ac5"),
  });

  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("ac5-offer").replace(/_/g, "-"),
      name: "AC5 offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
      allowedBillingTypes: ["one_time", "recurring"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: uniqueEmail("ac5-parent"), isVerified: true },
    athletes: [{ name: "AC5 Kid" }],
    bookings: [{ sessionIndex: 0, athleteIndex: 0, paymentStatus: "booked_offline" }],
    creditType: { name: "AC5 credits" },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  // Read the booking's price_snapshot before the policy change.
  const stateRes = await request.post("/api/dev/bookings", {
    data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![0] },
  });
  const state = (await stateRes.json()) as {
    bookings: Array<{ id: string; priceSnapshot: unknown }>;
  };
  expect(state.bookings.length).toBeGreaterThanOrEqual(1);
  const beforeSnapshot = state.bookings[0]!.priceSnapshot;

  // Update group type policy to remove package mode (simulates admin action).
  const updateRes = await request.post("/api/dev/group-type-policy", {
    data: {
      organizationId: orgId,
      groupTypeId: seed.groupTypeId!,
      allowedPurchaseModes: ["single_class"],
      allowedBillingTypes: ["one_time"],
    },
  });
  expect(updateRes.ok()).toBe(true);

  // Verify the booking's price_snapshot is unchanged after policy update.
  const stateAfterRes = await request.post("/api/dev/bookings", {
    data: { action: "state", organizationId: orgId, sessionId: seed.sessionIds![0] },
  });
  const stateAfter = (await stateAfterRes.json()) as {
    bookings: Array<{ id: string; priceSnapshot: unknown }>;
  };
  expect(stateAfter.bookings[0]!.priceSnapshot).toEqual(beforeSnapshot);
});

test("US-23.6/AC2 — new cash purchase blocked when policy excludes package mode", async ({
  request,
}) => {
  const email = uniqueEmail("e-ac62");
  await registerViaApi(request, email);
  const { orgId } = await seedOrgFull(request, {
    ownerEmail: email,
    name: "AC62 Academy",
    slug: uniqueId("ac62"),
    subdomain: uniqueSubdomain("ac62"),
  });

  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId("ac62-offer").replace(/_/g, "-"),
      name: "AC62 offer",
      price: 10_000,
      allowedPurchaseModes: ["single_class"], // No package — cash purchase will be blocked.
    },
    client: { email: uniqueEmail("ac62-parent"), isVerified: true },
    athletes: [{ name: "AC62 Kid" }],
    creditType: { name: "AC62 credits" },
    productTemplate: {
      name: "4-class pack",
      creditQuantity: 4,
      price: 15000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  // Try cash purchase via dev API → should fail with PurchasePolicyViolationError.
  const purchaseRes = await request.post("/api/dev/purchases", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      productTemplateId: seed.productTemplateId!,
    },
  });
  const purchaseBody = (await purchaseRes.json()) as { ok: boolean; error?: string };
  expect(purchaseBody.ok).toBe(false);
  // The error message should mention the policy violation.
  expect(purchaseBody.error).toBeTruthy();
});
