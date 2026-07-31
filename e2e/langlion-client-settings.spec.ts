import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { issueAndReadCode, requestCode } from "./client-auth-fixtures";
import { uniqueId } from "./billing-fixtures";
import {
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  uniqueNearFutureSlot,
} from "./helpers";
import { uniqueSubdomain, tenantUrl } from "./host-fixtures";

/**
 * Client notification settings + panel polish (plan Faza 6, docs/phases/06).
 *
 * Covers the DoD of §6a (the parent can switch notification types and the choice
 * persists) and §6b (greeting, empty states, mobile cards, settings link from
 * `/moje-zajecia`).
 *
 * The settings page renders 12 switch rows — 11 unique event types, because
 * `booking-confirmed` legitimately appears in two sections ("Rezerwacje" and
 * "Wnioski"). Preferences are DEVIATIONS from default-on, so a fresh parent sees
 * every switch checked.
 *
 * ⚠️ COOKIE SHARING (as in langlion-client-wallet): client auth MUST run through
 * `page.request.post()` so the session cookie lands on the page's context.
 */

const SWITCH_COUNT = 12;

async function seedAcademy(
  request: APIRequestContext,
  prefix: string,
  opts: { isVerified?: boolean; withBooking?: boolean } = {},
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });

  const parentEmail = uniqueEmail(`${prefix}-parent`);
  const slot = uniqueNearFutureSlot(7);
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId(`${prefix}-offer`).replace(/_/g, "-"),
      name: `${prefix} offer`,
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: parentEmail, isVerified: opts.isVerified ?? true },
    athletes: [{ name: "Child One" }],
    bookings: opts.withBooking
      ? [{ sessionIndex: 0, athleteIndex: 0, paymentStatus: "confirmed" }]
      : undefined,
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  return { orgId, subdomain, parentEmail };
}

async function loginAsParent(
  request: APIRequestContext,
  page: Page,
  subdomain: string,
  email: string,
) {
  const code = await issueAndReadCode(request, subdomain, email);
  const res = await page.request.post(tenantUrl(subdomain, "/api/client-auth/verify"), {
    data: { email, code },
  });
  expect(res.ok(), `verify-code failed: ${await res.text()}`).toBe(true);
}

test("6a: settings page renders every event type with a switch, all default-on", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6a1");
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia/ustawienia/powiadomienia"));

  await expect(
    page.getByRole("heading", { name: "Notification settings" }),
  ).toBeVisible();
  await expect(page.getByText("Choose which notifications you receive from this academy.")).toBeVisible();

  // The four themed sections from the phase-06 spec.
  for (const heading of [
    "Bookings and classes",
    "Payments and credits",
    "Requests and changes",
    "Qualification cards",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  const switches = page.getByRole("switch");
  await expect(switches).toHaveCount(SWITCH_COUNT);
  for (const one of await switches.all()) {
    await expect(one).toBeChecked();
  }

  // Save is enabled and the form carries the opt-out semantics (default-on rows
  // submit unchecked = off).
  await expect(page.getByRole("button", { name: "Save settings" })).toBeEnabled();
});

test("6a: toggling a switch off persists across a reload (and reload leaves the rest on)", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6a2");
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia/ustawienia/powiadomienia"));

  const reminder = page.getByRole("switch", { name: "Reminders about upcoming classes" });
  await expect(reminder).toBeChecked();
  await reminder.uncheck();

  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Notification settings have been saved.")).toBeVisible();

  // Reload re-reads from `notification_preference` — the switch must stay off.
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Reminders about upcoming classes" }),
  ).not.toBeChecked();

  // A control row untouched by the save is still on.
  await expect(
    page.getByRole("switch", { name: "Class rescheduled" }),
  ).toBeChecked();
});

test("6b: Settings link in the /moje-zajecia header navigates to the preferences", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6b1");
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Notification settings" }),
  ).toBeVisible();
});

test("6b: greeting and empty states for a parent with no bookings", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6b2", {
    withBooking: false,
  });
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));

  await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();
  await expect(page.getByText("No upcoming bookings.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the offer" })).toBeVisible();
  await expect(page.getByText("No credits in wallet.")).toBeVisible();
  await expect(page.getByText("No grades or progress notes yet.")).toBeVisible();
});

test("6b: mobile shows cards instead of the table for a parent with bookings", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6b3", {
    withBooking: true,
  });
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));

  // The desktop table is hidden below `md`; the booking surfaces as a card.
  await expect(page.getByRole("table")).not.toBeVisible();
  const mobileCard = page.locator("ul.md\\:hidden li").first();
  await expect(mobileCard).toBeVisible();
  await expect(mobileCard).toContainText("s6b3 offer");
  await expect(mobileCard).toContainText("confirmed");
});

test("6b: desktop still renders the table for a parent with bookings", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6b4", {
    withBooking: true,
  });
  await loginAsParent(request, page, subdomain, parentEmail);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));

  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator("ul.md\\:hidden li")).not.toBeVisible();
});

test("6a: an unverified parent cannot reach the settings", async ({ request, page }) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "s6a3", {
    isVerified: false,
  });

  // Requesting a code creates the client row but NO session: the parent never
  // redeems it, so there is nothing to serve the settings page to.
  const res = await requestCode(request, subdomain, { email: parentEmail });
  expect(res.ok(), `request-code failed: ${await res.text()}`).toBe(true);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia/ustawienia/powiadomienia"));

  await expect(page.getByText("Confirm your email address with a code first.")).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
});
