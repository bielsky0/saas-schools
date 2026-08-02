import { test, expect } from "@playwright/test";
const BASE = "http://miau.localtest.me:3000";
const PAGE = "960f3eb0-8030-41ce-864b-d2a8ea485cef";
test.use({ viewport: { width: 390, height: 844 } });
test("mobile editor: full mobile flow", async ({ page }) => {
  await page.goto(`${BASE}/editor?page=${PAGE}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Screen too small")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Wstecz" })).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Ustawienia motywu")).toBeVisible();
  await page.getByText("Ustawienia motywu").click();
  await expect(page.getByText("Aktywny motyw")).toBeVisible();
  await page.getByRole("button", { name: "Wstecz" }).first().click();
  await page.getByText("Strony").click();
  await expect(page.getByPlaceholder("Szukaj stron")).toBeVisible();
  await page.mouse.click(10, 100);
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("button", { name: "Wstecz" })).toBeVisible();
  await expect(page.getByText("Treść")).toBeVisible();
  await page.getByRole("button", { name: "Akcje bloku" }).click();
  await expect(page.getByText("Usuń sekcję")).toBeVisible();
  await expect(page.getByText("Bloki w sekcji")).toBeVisible();
});

test("mobile editor: canvas adapts to device width and tap on block opens settings", async ({ page }) => {
  await page.goto(`${BASE}/editor?page=${PAGE}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Screen too small")).toHaveCount(0);
  await expect(page.locator("#canvas-iframe")).toBeVisible();

  await expect
    .poll(() =>
      page.locator("#canvas-iframe").evaluate((el) => {
        const match = (el as HTMLElement).style.transform.match(/scale\(([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 0;
      }),
    )
    .toBeGreaterThan(0.9);

  const block = page
    .frameLocator("#canvas-iframe")
    .locator('[data-block-id]:not([data-block-id="canvas"]):not([data-block-id="container"])')
    .first();
  await expect(block).toBeVisible();
  await block.click();

  await expect(page.getByRole("button", { name: "Wstecz" })).toBeVisible();
  await expect(page.getByText("Treść")).toBeVisible();
});
