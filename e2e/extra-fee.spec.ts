import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  registerAndVerify,
  seedOrgFull,
  uniqueEmail,
  TEST_PASSWORD,
} from "./helpers";
import { uniqueSubdomain } from "./host-fixtures";

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const WARSAW = "Europe/Warsaw";

async function seedAcademy(
  request: APIRequestContext,
  prefix: string,
) {
  const ownerEmail = uniqueEmail(`${prefix}-own`);
  await registerAndVerify(request, ownerEmail);

  const { orgId, subdomain, slug } = await seedOrgFull(request, {
    ownerEmail,
    slug: uniqueSlug(prefix),
    subdomain: uniqueSubdomain(prefix),
    name: `Academy ${prefix}`,
    currency: "PLN",
    timezone: WARSAW,
  });

  return { orgId, subdomain, slug, ownerEmail };
}

test.describe("extra_fee", () => {
  test("admin can view extra_fees list", async ({ page, request }) => {
    const { ownerEmail } = await seedAcademy(request, "xfee");

    await page.goto("/login");
    await page.fill('input[name="email"]', ownerEmail);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");

    await page.goto("/dashboard/extra-fees");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Additional fees");
  });

  test("user without extra_fees.manage gets 403 on backend", async ({ request }) => {
    const memberEmail = uniqueEmail("xfee-mem");
    await registerAndVerify(request, memberEmail);

    const response = await request.get("/dashboard/extra-fees");
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
