import { expect, test } from "@playwright/test";

import { registerViaApi, loginViaUi, seedOrgFull, uniqueEmail, TEST_PASSWORD } from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Trainer availability (langlion EPIK 34, plan Faza 17.5).
 */
test("admin can view a trainer's availability page", async ({ page, request }) => {
  const ownerEmail = uniqueEmail("avail-owner");
  const trainerEmail = uniqueEmail("avail-trainer");
  await registerViaApi(request, ownerEmail);
  await registerViaApi(request, trainerEmail);

  const { subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: "Avail Academy",
    slug: uniqueId("avail"),
    subdomain: uniqueSubdomain("avail"),
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  await page.goto(tenantUrl(subdomain, "/login"));
  await loginViaUi(page, ownerEmail, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  await page.goto(tenantUrl(subdomain, "/dashboard/trainers"));
  await page.waitForURL("**/dashboard/trainers");

  await expect(page.getByText(trainerEmail)).toBeVisible();
});
