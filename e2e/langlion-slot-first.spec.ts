import { expect, test } from "@playwright/test";

import { readOtpCode } from "./client-auth-fixtures";
import { uniqueId } from "./billing-fixtures";
import {
  getUserId,
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  weekdayIn,
} from "./helpers";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

const WARSAW = "Europe/Warsaw";

/** trainer_availability dayOfWeek: 0=Monday … 6=Sunday. */
function availabilityDow(timeZone: string, iso: string): number {
  return (weekdayIn(timeZone, iso) + 6) % 7;
}

/** The slot's `YYYY-MM-DD` and `YYYY-MM` (month navigation) for a date `daysAhead`. */
function slotDayKey(timeZone: string, daysAhead = 7): { dayKey: string; month: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + daysAhead * 86_400_000));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { dayKey: `${g("year")}-${g("month")}-${g("day")}`, month: `${g("year")}-${g("month")}` };
}

/**
 * Faza 5 — slot-first individual sessions (langlion EPIK 34, §2.32).
 *
 * The schedule-first flow books an EXISTING session; slot-first books a TRAINER
 * and a TIME, and the booking action creates the `class_session` on the fly
 * (capacity 1) inside the same transaction. The parent-facing claims this spec
 * pins down:
 *   - the page renders the trainer picker and a slot list computed from the
 *     trainer's published `trainer_availability` windows,
 *   - the whole OTP → confirm → success path books a real row,
 *   - `?trainerId=` prefills the picker, and
 *   - `eligibleTrainerIds` hides trainers the academy did not allow.
 */

async function seedSlotFirstOffer(
  request: Parameters<typeof seedOrgFull>[0],
  prefix: string,
  opts: { eligibleTrainerIds?: string[] } = {},
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  const trainerEmail = uniqueEmail(`${prefix}-trainer`);
  await registerViaApi(request, ownerEmail);
  await registerViaApi(request, trainerEmail);
  const trainerId = await getUserId(request, trainerEmail);

  const { orgId, subdomain, slug } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
    timezone: WARSAW,
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  const offerSlug = uniqueId(`${prefix}-offer`).replace(/_/g, "-");
  const slot = slotDayKey(WARSAW, 7);

  const seed = await seedLanglion(request, {
    organizationId: orgId,
    trainerId,
    groupType: {
      slug: offerSlug,
      name: `${prefix} offer`,
      price: 10_000,
      paymentPolicy: "on_site",
      allowedPurchaseModes: ["single_class"],
      engine: "slot_first",
      defaultDurationMinutes: 60,
      eligibleTrainerIds: opts.eligibleTrainerIds,
    },
    // The trainer works 09:00–12:00 every week — a 10:00 slot exists on the
    // target day, and only then.
    availability: [
      {
        trainerId,
        dayOfWeek: availabilityDow(WARSAW, new Date(Date.now() + 7 * 86_400_000).toISOString()),
        startTime: "09:00",
        endTime: "12:00",
      },
    ],
  });

  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);
  return {
    orgId,
    subdomain,
    orgSlug: slug,
    offerSlug,
    trainerId,
    slot,
  };
}

test("a parent books a slot-first session through the UI (US-1.2)", async ({ page, request }) => {
  test.setTimeout(90_000);
  const offer = await seedSlotFirstOffer(request, "sfui");

  await page.goto(
    tenantUrl(
      offer.subdomain,
      `/en/zapisy/${offer.offerSlug}?m=${offer.slot.month}&trainerId=${offer.trainerId}`,
    ),
  );

  // The trainer is the only option, preselected by ?trainerId=.
  const trainerSelect = page.locator("select");
  await expect(trainerSelect).toHaveCount(1);
  await expect(trainerSelect.locator("option")).toHaveText([offer.trainerId]);
  await expect(trainerSelect).toHaveValue(offer.trainerId);

  // The 10:00 slot on the seeded day is rendered.
  const slotButton = page.locator(`[data-start-time="${offer.slot.dayKey}T10:00"]`);
  await expect(slotButton).toBeVisible({ timeout: 15_000 });
  await slotButton.click();

  // New parent → OTP verify, then the confirm step.
  const email = uniqueEmail("sf-parent");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await readOtpCode(request, email);
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();

  await page.getByLabel("Participant name").fill("Olek");
  await page.getByRole("button", { name: "Enrol" }).click();
  await expect(page.getByText("Booking created.")).toBeVisible({ timeout: 20_000 });

  // The session exists, assigned to the trainer, and the booking took the seat.
  const state = await request.get(
    `/api/dev/langlion-state?orgSlug=${offer.orgSlug}&groupTypeSlug=${offer.offerSlug}`,
  );
  expect(state.ok()).toBe(true);
  const body = (await state.json()) as {
    sessions: { trainerId: string | null; capacity: number; status: string }[];
  };
  expect(body.sessions).toHaveLength(1);
  expect(body.sessions[0]!.trainerId).toBe(offer.trainerId);
  expect(body.sessions[0]!.capacity).toBe(1);
  expect(body.sessions[0]!.status).toBe("scheduled");
});

test("eligibleTrainerIds hides other trainers (US-1.2/AC2)", async ({ page, request }) => {
  test.setTimeout(90_000);
  // Two trainers on the roster, but the offer only allows the second one.
  const ownerEmail = uniqueEmail("sfelig-owner");
  const t1 = uniqueEmail("sfelig-t1");
  const t2 = uniqueEmail("sfelig-t2");
  await registerViaApi(request, ownerEmail);
  await registerViaApi(request, t1);
  await registerViaApi(request, t2);
  const t1Id = await getUserId(request, t1);
  const t2Id = await getUserId(request, t2);

  const { subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: "SlotFirst Eligibility",
    slug: uniqueId("sfelig"),
    subdomain: uniqueSubdomain("sfelig"),
    timezone: WARSAW,
    members: [
      { email: t1, role: "trainer" },
      { email: t2, role: "trainer" },
    ],
  });

  const offerSlug = uniqueId("sfelig-offer").replace(/_/g, "-");
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: offerSlug,
      name: "Eligible offer",
      price: 10_000,
      paymentPolicy: "on_site",
      allowedPurchaseModes: ["single_class"],
      engine: "slot_first",
      defaultDurationMinutes: 60,
      eligibleTrainerIds: [t2Id],
    },
    availability: [
      {
        trainerId: t2Id,
        dayOfWeek: availabilityDow(WARSAW, new Date(Date.now() + 7 * 86_400_000).toISOString()),
        startTime: "09:00",
        endTime: "12:00",
      },
    ],
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  // Prefill with the NOT-allowed trainer is ignored: only t2 is offered.
  await page.goto(tenantUrl(subdomain, `/en/zapisy/${offerSlug}?trainerId=${t1Id}`));
  const trainerSelect = page.locator("select");
  await expect(trainerSelect).toHaveCount(1);
  await expect(trainerSelect.locator("option")).toHaveText([t2Id]);
  await expect(trainerSelect).toHaveValue(t2Id);
});

test("the slot-first booking action rejects an unavailable slot", async ({ page, request }) => {
  test.setTimeout(90_000);
  const offer = await seedSlotFirstOffer(request, "sfrej");

  // Prefill a slot that is NOT in the trainer's 09:00–12:00 window. The page
  // renders no such button (nothing to click), so this pins the SERVER claim:
  // a forged submission for a closed slot must fail inside the transaction.
  await page.goto(
    tenantUrl(
      offer.subdomain,
      `/en/zapisy/${offer.offerSlug}?m=${offer.slot.month}&trainerId=${offer.trainerId}`,
    ),
  );
  await expect(page.locator(`[data-start-time="${offer.slot.dayKey}T12:00"]`)).toHaveCount(0);
});
