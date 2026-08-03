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
 * Blog CMS dashboard (blog-templates-cms F5.1).
 *
 * Drives the post editor through the real UI on an academy's own host:
 *   - the sidebar exposes Blog for a `cms.manage` owner,
 *   - a new post can be created and published from the dashboard,
 *   - the created post shows up in the post list and on the public blog.
 */

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function seedAcademy(request: APIRequestContext, prefix: string) {
  const ownerEmail = uniqueEmail(`${prefix}-own`);
  await registerAndVerify(request, ownerEmail);
  const { slug } = await seedOrgFull(request, {
    ownerEmail,
    slug: uniqueSlug(prefix),
    name: `Academy ${prefix}`,
    timezone: "Europe/Warsaw",
    currency: "PLN",
  });
  return { ownerEmail, slug };
}

async function landOnDashboard(page: Page, subdomain: string, email: string) {
  await page.goto(tenantUrl(subdomain, "/login"));
  await loginToAcademy(page, subdomain, email, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");
}

test("F5.1: create, publish and list a blog post from the dashboard", async ({
  page,
  request,
}) => {
  const { ownerEmail, slug } = await seedAcademy(request, "blog-cms");
  await landOnDashboard(page, slug, ownerEmail);

  // Sidebar exposes the Blog entry (cms.manage owner).
  await page.getByRole("link", { name: "Blog" }).click();
  await page.waitForURL("**/dashboard/blog");
  await expect(
    page.getByRole("heading", { name: "Blog" }),
  ).toBeVisible();

  const title = `Pierwszy wpis ${uniqueSlug("wpis")}`;

  // Create.
  await page.getByRole("link", { name: "New post" }).click();
  await page.waitForURL("**/dashboard/blog/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);

  // TipTap body — the editor is a contenteditable (.ProseMirror).
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await editor.pressSequentially("To jest treść wpisu.", { delay: 5 });

  // The publish switch is a Radix Switch; toggle it on.
  await page.getByRole("switch", { name: "Published" }).click();

  await page.getByRole("button", { name: "Create post" }).click();
  await page.waitForURL(/dashboard\/blog\/[0-9a-f-]{8,}/);
  // Server-action redirects are resolved internally by Next (F4.6) and can
  // leave the client router in a stale state in dev; force a hard navigation
  // so the editor page actually renders before we assert on it.
  await page.goto(page.url());

  // Back to the list — the post is there with a Published badge.
  await page.getByRole("link", { name: "Back to posts" }).click();
  await page.waitForURL("**/dashboard/blog");
  await expect(
    page.getByRole("cell", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }),
  ).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

  // Public blog renders the post.
  await page.goto(tenantUrl(slug, "/en/blog"));
  await expect(
    page.getByRole("link", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }),
  ).toBeVisible();
});
