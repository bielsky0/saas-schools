import { expect, test } from "@playwright/test";

import { registerViaApi, loginViaUi, seedOrgFull, uniqueEmail, TEST_PASSWORD } from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Trainer rates and earnings (langlion EPIK 32, plan Faza 20).
 */
test.describe("trainer rates", () => {
  test("admin creates a base rate and a group-specific override", async ({ page, request }) => {
    const ownerEmail = uniqueEmail("rate-admin");
    const trainerEmail = uniqueEmail("rate-trainer");
    await registerViaApi(request, ownerEmail);
    await registerViaApi(request, trainerEmail);

    const { subdomain } = await seedOrgFull(request, {
      ownerEmail,
      name: "Rate Academy",
      slug: uniqueId("rate"),
      subdomain: uniqueSubdomain("rate"),
      members: [{ email: trainerEmail, role: "trainer" }],
    });

    // Create a group type first
    const groupTypeSlug = uniqueId("gt");
    const createGt = await request.post("/api/dev/seed-langlion", {
      data: {
        op: "createGroupType",
        subdomain,
        slug: groupTypeSlug,
        name: "Kickboxing",
        price: 5000,
        allowedPurchaseModes: ["single_class"],
      },
    });
    expect(createGt.ok()).toBeTruthy();

    await page.goto(tenantUrl(subdomain, "/login"));
    await loginViaUi(page, ownerEmail, TEST_PASSWORD);
    await page.waitForURL("**/dashboard");

    await page.goto(tenantUrl(subdomain, "/dashboard/trainers/rates"));
    await page.waitForURL("**/dashboard/trainers/rates");

    // Should see the rates page with an empty state
    await expect(page.getByText("Trainer rates")).toBeVisible();

    // Create a base rate for the trainer
    await page.getByRole("combobox").first().click();
    await page.getByText(trainerEmail).click();
    await page.locator('input[name="amount"]').fill("10000");
    await page.locator('input[name="effectiveFrom"]').fill("2026-01-01");
    await page.getByRole("button", { name: "Add window" }).click();

    // Verify the rate appears in the table
    await expect(page.getByText("100.00")).toBeVisible();
    await expect(page.getByText("Base rate")).toBeVisible();
  });
});
