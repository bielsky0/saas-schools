import { expect, test, type Page } from "@playwright/test";

/**
 * Publish / unpublish regression (Phase 7).
 *
 * Round-trips the seed page through publish and back to a draft so the shared
 * fixture page keeps the same baseline across runs. State is read from the
 * publish dropdown (reliable) rather than the main button label ("Publikuj"
 * is also shown when a published page carries unpublished changes).
 */
const BASE = "http://miau.localtest.me:3000";
const PAGE = "960f3eb0-8030-41ce-864b-d2a8ea485cef";

async function openEditor(page: Page) {
  await page.goto(`${BASE}/editor?page=${PAGE}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Screen too small")).toHaveCount(0);
  await expect(page.locator("#canvas-iframe")).toBeVisible();
}

/** Main publish button — "Publikuj" (draft) or "Published" (online). */
function publishButton(page: Page) {
  return page.getByRole("button", { name: /^(Publikuj|Published)/i });
}

/** The chevron trigger right after the main publish button opens the dropdown. */
async function openPublishMenu(page: Page) {
  await publishButton(page).locator("xpath=following-sibling::button[1]").click();
}

/** True when the page is online — the dropdown then offers "Cofnij publikację". */
async function isPagePublished(page: Page): Promise<boolean> {
  await openPublishMenu(page);
  const hasUnpublish = (await page.getByRole("menuitem", { name: /Cofnij publikację/i }).count()) > 0;
  await page.keyboard.press("Escape");
  return hasUnpublish;
}

/** Take the page offline via the dropdown + confirmation dialog. */
async function unpublish(page: Page) {
  await openPublishMenu(page);
  await page.getByRole("menuitem", { name: /Cofnij publikację/i }).click();
  await page.getByRole("button", { name: /Cofnij publikację/i }).click();
  await expect(publishButton(page)).toBeVisible({ timeout: 15000 });
}

test("desktop editor: publish and unpublish round-trip", async ({ page }) => {
  await openEditor(page);

  // Normalize to an unpublished baseline.
  if (await isPagePublished(page)) {
    await unpublish(page);
  }

  // Publish the page.
  await publishButton(page).click();
  await expect(page.getByRole("button", { name: /^Published/i })).toBeVisible({ timeout: 20000 });

  // The dropdown now offers unpublish.
  await openPublishMenu(page);
  await expect(page.getByRole("menuitem", { name: /Cofnij publikację/i })).toBeVisible();
  await page.keyboard.press("Escape");

  // Take it offline again, restoring the baseline.
  await unpublish(page);
  await expect(page.getByRole("button", { name: /^Publikuj/i })).toBeVisible();
});
