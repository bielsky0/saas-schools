import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { tenantUrl } from "./host-fixtures";
import {
  loginToAcademy,
  registerAndVerify,
  seedOrgFull,
  uniqueEmail,
  TEST_PASSWORD,
} from "./helpers";

/**
 * Dashboard polish (Faza 07).
 *
 * Phase 07 DoD, driven through the real UI on an academy's own host:
 *   - the per-role dashboard home renders its cards,
 *   - the schedule page toggles between List and Calendar,
 *   - the mobile sheet navigates.
 *
 * EVERY TEST MINTS ITS OWN ACADEMY. The suite runs `fullyParallel` and shares one
 * database; a shared tenant would race between workers. Same discipline as
 * `langlion-schedule.spec.ts`.
 */

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function seedAcademy(request: APIRequestContext, prefix: string) {
  const ownerEmail = uniqueEmail(`${prefix}-own`);
  await registerAndVerify(request, ownerEmail);
  const { slug, orgId } = await seedOrgFull(request, {
    ownerEmail,
    slug: uniqueSlug(prefix),
    name: `Academy ${prefix}`,
    timezone: "Europe/Warsaw",
    currency: "PLN",
  });
  return { ownerEmail, slug, orgId };
}

async function landOnDashboard(page: Page, subdomain: string, email: string) {
  await page.goto(tenantUrl(subdomain, "/login"));
  await loginToAcademy(page, subdomain, email, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");
}

test("admin dashboard home renders the management cards", async ({ page, request }) => {
  const { ownerEmail, slug } = await seedAcademy(request, "da-cards");
  await landOnDashboard(page, slug, ownerEmail);

  // Faza 07 §7a — admin/owner card set. Empty academy, so the stats + empty
  // states are what render; every card must be present.
  await expect(page.getByRole("heading", { name: /Academy da-cards/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick actions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
});

test("schedule page toggles to the calendar view", async ({ page, request }) => {
  const { ownerEmail, slug } = await seedAcademy(request, "da-cal");
  await landOnDashboard(page, slug, ownerEmail);

  await page.goto(tenantUrl(slug, "/en/dashboard/schedule"));
  await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  await page.getByRole("tab", { name: "Calendar" }).click();
  await page.waitForURL(/view=calendar/);

  // Calendar view: weekday header + at least the previous/next month links.
  await expect(page.getByText("Mo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Previous month" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Next month" })).toBeVisible();
});

test("mobile sheet navigates on a narrow viewport", async ({ page, request }) => {
  test.setTimeout(90_000);
  const { ownerEmail, slug } = await seedAcademy(request, "da-mob");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(tenantUrl(slug, "/login"));
  await loginToAcademy(page, slug, ownerEmail, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  // Faza 07 §7d — the hamburger opens the Sheet on mobile.
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // No horizontal overflow on the dashboard home itself.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
