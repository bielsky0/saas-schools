import { expect, test } from "@playwright/test";

import {
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  uniqueNearFutureSlot,
} from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Policy document & acceptance (langlion EPIK 28, §2.18, plan Faza 17).
 *
 * Tests the US-28.1–28.4 rules at the createBooking boundary via the dev
 * `/api/dev/bookings` route, which calls the production `createBooking`.
 * The UI-level flow (checkbox rendering, navigation) lives in enrollment specs.
 */

/** Seed an offer WITH a policy document assigned to the group type. */
async function seedPolicyOffer(
  request: Parameters<typeof seedOrgFull>[0],
  prefix: string,
  opts: { capacity?: number; athletes?: number } = {},
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const { orgId, subdomain, slug } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });

  const offerSlug = uniqueId(`${prefix}-offer`).replace(/_/g, "-");
  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: offerSlug,
      name: `${prefix} offer`,
      price: 10_000,
      paymentPolicy: "on_site",
      allowedPurchaseModes: ["single_class"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: opts.capacity ?? 8 }],
    client: { email: uniqueEmail(`${prefix}-parent`), isVerified: true },
    athletes: Array.from({ length: opts.athletes ?? 1 }, (_, i) => ({ name: `Child ${i + 1}` })),
    policyDocument: {
      name: "Test Regulamin",
    },
  });

  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState ?? ""}`).toBe(true);
  expect(seed.policyDocumentId).toBeTruthy();

  return {
    orgId,
    subdomain,
    offerSlug,
    groupTypeId: seed.groupTypeId!,
    sessionId: seed.sessionIds![0]!,
    clientId: seed.clientId!,
    athleteIds: seed.athleteIds!,
    policyDocumentId: seed.policyDocumentId!,
    slot,
  };
}

/** Seed an offer WITHOUT a policy document. */
async function seedNoPolicyOffer(
  request: Parameters<typeof seedOrgFull>[0],
  prefix: string,
  opts: { capacity?: number; athletes?: number } = {},
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });

  const offerSlug = uniqueId(`${prefix}-offer`).replace(/_/g, "-");
  const slot = uniqueNearFutureSlot();
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: offerSlug,
      name: `${prefix} offer`,
      price: 10_000,
      paymentPolicy: "on_site",
      allowedPurchaseModes: ["single_class"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: opts.capacity ?? 8 }],
    client: { email: uniqueEmail(`${prefix}-parent`), isVerified: true },
    athletes: Array.from({ length: opts.athletes ?? 1 }, (_, i) => ({ name: `Child ${i + 1}` })),
  });

  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState ?? ""}`).toBe(true);

  return {
    orgId,
    subdomain,
    offerSlug,
    groupTypeId: seed.groupTypeId!,
    sessionId: seed.sessionIds![0]!,
    clientId: seed.clientId!,
    athleteIds: seed.athleteIds!,
    slot,
  };
}

test.describe("US-28 — Regulaminy i akceptacje", () => {
  test("US-28.1/AC2: group type without policy → no acceptance needed, booking succeeds", async ({
    request,
  }) => {
    const offer = await seedNoPolicyOffer(request, "no-policy");

    const booking = await devCreateBooking(request, {
      organizationId: offer.orgId,
      sessionId: offer.sessionId,
      clientId: offer.clientId,
      athleteId: offer.athleteIds[0]!,
    });

    expect(booking.ok).toBe(true);
  });

  test("US-28.2/AC1: booking without acceptance when policy exists → refused", async ({
    request,
  }) => {
    const offer = await seedPolicyOffer(request, "must-accept");

    const booking = await devCreateBooking(request, {
      organizationId: offer.orgId,
      sessionId: offer.sessionId,
      clientId: offer.clientId,
      athleteId: offer.athleteIds[0]!,
      policyDocumentId: offer.policyDocumentId,
      // No policyDocumentVersion — client didn't accept
    });

    expect(booking.ok).toBe(false);
    expect(booking.reason).toBe("policy_not_accepted");
  });

  test("US-28.2/AC1: booking with correct policy acceptance → succeeds", async ({ request }) => {
    const offer = await seedPolicyOffer(request, "accept-ok");

    const booking = await devCreateBooking(request, {
      organizationId: offer.orgId,
      sessionId: offer.sessionId,
      clientId: offer.clientId,
      athleteId: offer.athleteIds[0]!,
      policyDocumentId: offer.policyDocumentId,
      policyDocumentVersion: 1,
    });

    expect(booking.ok).toBe(true);
  });

  test("R3: stale policy version → PolicyVersionChangedError", async ({ request }) => {
    const offer = await seedPolicyOffer(request, "stale-version");

    // First booking with correct version — succeeds
    const first = await devCreateBooking(request, {
      organizationId: offer.orgId,
      sessionId: offer.sessionId,
      clientId: offer.clientId,
      athleteId: offer.athleteIds[0]!,
      policyDocumentId: offer.policyDocumentId,
      policyDocumentVersion: 1,
    });
    expect(first.ok).toBe(true);

    // Second booking with WRONG version (2 instead of 1) → refused
    const wrong = await devCreateBooking(request, {
      organizationId: offer.orgId,
      sessionId: offer.sessionId,
      clientId: offer.clientId,
      athleteId: offer.athleteIds[0]!,
      policyDocumentId: offer.policyDocumentId,
      policyDocumentVersion: 2,
    });

    expect(wrong.ok).toBe(false);
  });
});

async function devCreateBooking(
  request: Parameters<typeof seedOrgFull>[0],
  body: {
    organizationId: string;
    sessionId: string;
    clientId: string;
    athleteId: string;
    paymentMethod?: string;
    onlineAvailable?: boolean;
    holdMs?: number;
    policyDocumentId?: string;
    policyDocumentVersion?: number;
  },
): Promise<{ ok: boolean; reason?: string; paymentStatus?: string }> {
  const res = await request.post("/api/dev/bookings", {
    data: { ...body, action: "create" },
  });
  return (await res.json()) as { ok: boolean; reason?: string; paymentStatus?: string };
}
