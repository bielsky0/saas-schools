import { expect, test, type Page } from "@playwright/test";

const BASE = "http://miau.localtest.me:3000";
const PAGE = "960f3eb0-8030-41ce-864b-d2a8ea485cef";

async function openEditor(page: Page, pageId = PAGE) {
  await page.goto(`${BASE}/editor?page=${pageId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Screen too small")).toHaveCount(0);
  await expect(page.locator("#canvas-iframe")).toBeVisible();
}

test("desktop editor: topbar and tabs render", async ({ page }) => {
  await openEditor(page);
  for (const tab of ["Sekcje", "Motyw", "Strony"]) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Zapisano|Wersja robocza|Zapisywanie/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Publikuj|Opublikowana/ })).toBeVisible();
});

test("desktop editor: sections tree, search, select block and edit style", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await expect(page.getByText("Nagłówek")).toBeVisible();

  const search = page.getByPlaceholder("Szukaj bloków...");
  await expect(search).toBeVisible();
  await search.fill("zzzz-no-match");
  await expect(page.getByText("Nie znaleziono sekcji")).toBeVisible();
  await search.fill("");
  await expect(page.locator("[data-node-id]").first()).toBeVisible();

  await row.click();
  await expect(page.getByRole("tab", { name: "Treść" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Styl" })).toBeVisible();
  await page.getByRole("tab", { name: "Styl" }).click();
});

test("desktop editor: save state transitions on block edit (rename + undo + save)", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();

  const nameDiv = row.locator("div.truncate").first();
  const nameSpan = nameDiv.locator("span").first();
  const original = (await nameSpan.getAttribute("title")) ?? (await nameSpan.textContent());

  await nameDiv.dblclick();
  const input = row.locator("input");
  await expect(input).toBeVisible();
  await input.fill(`QA smoke ${Date.now()}`);
  await input.press("Enter");

  await expect(page.getByRole("button", { name: "Wersja robocza" })).toBeVisible();
  const saveButton = page.getByRole("button", { name: "Wersja robocza" });
  if (await saveButton.isVisible()) {
    await saveButton.click();
  }
  await expect(page.getByText("Zapisano")).toBeVisible({ timeout: 15000 });

  await page.locator("button:has(svg.ResetIcon)").first().click();
  await expect(page.getByRole("button", { name: "Wersja robocza" })).toBeVisible();
  const restored = (await nameSpan.getAttribute("title")) ?? (await nameSpan.textContent());
  expect(restored).toBe(original);

  const saveButtonAfterUndo = page.getByRole("button", { name: "Wersja robocza" });
  if (await saveButtonAfterUndo.isVisible()) {
    await saveButtonAfterUndo.click();
  }
  await expect(page.getByText("Zapisano")).toBeVisible({ timeout: 15000 });
});

test("desktop editor: theme tab opens token groups and dark mode toggles canvas", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "Motyw" }).click();
  await expect(page.getByText("Aktywny motyw")).toBeVisible();
  for (const section of ["PODSTAWY", "KOMPONENTY", "MARKA"]) {
    await expect(page.getByText(section)).toBeVisible();
  }
  await expect(page.getByText("Kolory")).toBeVisible();
  await expect(page.getByText("Typografia")).toBeVisible();

  await page.getByText("Kolory").click();
  await expect(page.getByText("Gotowe palety")).toBeVisible();
  const toggle = page.getByLabel("Przełącz tryb ciemny");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const iframeHtml = page.frameLocator("#canvas-iframe").locator("html");
  await expect.poll(async () => (await iframeHtml.getAttribute("class")) ?? "").toContain("dark");
});

test("desktop editor: pages tab opens page settings (General/SEO/Access)", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "Strony" }).click();
  await expect(page.getByPlaceholder("Szukaj stron")).toBeVisible();

  const pageRow = page.locator("div[class*='cursor-pointer'][class*='h-7']").first();
  await expect(pageRow).toBeVisible();
  await pageRow.click();

  await expect(page.getByRole("tab", { name: "Ogólne" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "SEO" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Dostęp" })).toBeVisible();
  await expect(page.getByText("Nazwa strony")).toBeVisible();

  await page.getByRole("tab", { name: "SEO" }).click();
  await expect(page.getByText("Podgląd w wynikach Google")).toBeVisible();

  await page.getByRole("tab", { name: "Dostęp" }).click();
  await expect(page.getByText("Status publikacji")).toBeVisible();
});

test("desktop editor: switching tabs keeps selected block context", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("tab", { name: "Treść" })).toBeVisible();

  await page.getByRole("tab", { name: "Motyw" }).click();
  await expect(page.getByText("Aktywny motyw")).toBeVisible();

  await page.getByRole("tab", { name: "Sekcje" }).click();
  await expect(page.getByRole("tab", { name: "Treść" })).toBeVisible();
});

test("desktop editor: preview button opens the preview in a new tab", async ({ page }) => {
  await openEditor(page);
  const previewLink = page.locator('a[href*="/api/preview?slug"]').first();
  await expect(previewLink).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await previewLink.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");

  expect(popup.url()).toContain("/api/preview");
});

test("desktop editor: AI generate section dialog shows the stub notice", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: /Wygeneruj sekcję z opisu/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Wygeneruj sekcję/i)).toBeVisible();

  const textarea = dialog.getByPlaceholder(/np\./i);
  await expect(textarea).toBeVisible();
  await textarea.fill("Sekcja hero dla testu");

  await dialog.getByRole("button", { name: /Generuj/i }).click();
  await expect(dialog.getByText("Funkcja w przygotowaniu")).toBeVisible();
});

test("desktop editor: block panel header shows breadcrumb and quick actions", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await row.click();

  await expect(page.getByLabel("Block path")).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplikuj" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kopiuj" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ukryj|Pokaż/ })).toBeVisible();
});

test("desktop editor: quick styles and search render in the Styl tab", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await row.click();

  await page.getByRole("tab", { name: "Styl" }).click();
  await expect(page.getByText("Tło")).toBeVisible();
  await expect(page.getByText("Odstępy wewnętrzne")).toBeVisible();
  await expect(page.getByText("Opisz, jak zmienić wygląd")).toBeVisible();
  await expect(page.getByPlaceholder("Szukaj właściwości stylu")).toBeVisible();
});

test("desktop editor: content AI bar and AI tab render", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("[data-node-id]").first();
  await expect(row).toBeVisible();
  await row.click();

  await expect(page.getByText("Popraw lub przepisz treść")).toBeVisible();
  await expect(page.getByRole("tab", { name: "AI" })).toBeVisible();
});
