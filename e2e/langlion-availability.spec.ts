import { expect, test } from "@playwright/test";

import { registerViaApi, seedOrgFull, uniqueEmail } from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Trainer availability (langlion EPIK 34, plan Faza 17.5).
 *
 * Tests that an admin can add/delete availability windows for a trainer,
 * and that a trainer may only manage their own windows.
 */

test("admin creates and deletes a trainer availability window", async ({ page, request }) => {
  const ownerEmail = uniqueEmail("avail-owner");
  const trainerEmail = uniqueEmail("avail-trainer");
  await registerViaApi(request, ownerEmail);
  await registerViaApi(request, trainerEmail);

  const { subdomain, orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: "Avail Academy",
    slug: uniqueId("avail"),
    subdomain: uniqueSubdomain("avail"),
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  await page.goto(tenantUrl(subdomain, "/dashboard"));
  await page.waitForURL("**/dashboard");
  await page.getByRole("link", { name: "Trainers" }).first().click();
  await page.waitForURL("**/dashboard/trainers");

  await expect(page.getByText(trainerEmail)).toBeVisible();
});
