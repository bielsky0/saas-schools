import { tenantUrl } from "./host-fixtures";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  getLanglionState,
  loginToAcademy,
  registerAndVerify,
  seedOrgFull,
  uniqueEmail,
  TEST_PASSWORD,
} from "./helpers";

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function seedAcademy(request: APIRequestContext, prefix: string) {
  const ownerEmail = uniqueEmail(`${prefix}-own`);
  const trainerEmail = uniqueEmail(`${prefix}-tr`);
  await registerAndVerify(request, ownerEmail);
  await registerAndVerify(request, trainerEmail);

  const { slug, orgId } = await seedOrgFull(request, {
    ownerEmail,
    slug: uniqueSlug(prefix),
    name: `Academy ${prefix}`,
    timezone: "Europe/Warsaw",
    currency: "PLN",
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  return { ownerEmail, trainerEmail, slug, orgId };
}

async function loginAndLand(page: Page, subdomain: string, email: string) {
  await loginToAcademy(page, subdomain, email, TEST_PASSWORD);
}

function csvLine(fields: Record<string, string>): string {
  const order = [
    "email",
    "parentName",
    "phone",
    "childName",
    "age",
    "emergencyContactName",
    "emergencyContactPhone",
    "healthNotes",
  ];
  return order.map((key) => fields[key] ?? "").join(",");
}

function csvFile(header: string, ...rows: string[]): string {
  return [header, ...rows].join("\n");
}

const HEADER =
  "email,parentName,phone,childName,age,emergencyContactName,emergencyContactPhone,healthNotes";

test.describe("EPIK 39 — CSV import (Faza 25)", () => {
  test("US-39.1/AC1 — importuje klientów i zawodników z poprawnego CSV", async ({
    page,
    request,
  }) => {
    const { ownerEmail, slug } = await seedAcademy(request, "imp1");
    await loginAndLand(page, slug, ownerEmail);
    await page.goto(tenantUrl(slug, "/en/dashboard/import"));

    const csv = csvFile(
      HEADER,
      csvLine({ email: uniqueEmail("par1"), childName: "Alice", age: "10" }),
      csvLine({ email: uniqueEmail("par2"), childName: "Bob", age: "12", parentName: "Parent Two" }),
    );

    await page.getByLabel("CSV file").setInputFiles({
      name: "import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import" }).click();

    // Wait for the import to finish — the button text changes back from "Importing…"
    await expect(page.getByRole("button", { name: "Import" })).toBeEnabled({ timeout: 15000 });

    await expect(page.getByText(/Successfully imported 2 rows/)).toBeVisible();

    const state = await getLanglionState(request, { orgSlug: slug });
    expect(state.clients).toHaveLength(2);
    expect(state.athletes).toHaveLength(2);

    const aliceAthlete = state.athletes.find((a) => a.name === "Alice");
    expect(aliceAthlete).toBeDefined();
    expect(aliceAthlete!.age).toBe(10);

    for (const c of state.clients) {
      expect(c.isVerified).toBe(false);
    }
  });

  test("US-39.1/AC2 — dedup rodzica po email, dopisuje dziecko do istniejącego profilu", async ({
    page,
    request,
  }) => {
    const { ownerEmail, slug } = await seedAcademy(request, "imp2");
    await loginAndLand(page, slug, ownerEmail);

    const parentEmail = uniqueEmail("deduppar1");

    const csv = csvFile(
      HEADER,
      csvLine({ email: parentEmail, childName: "Alice", age: "8" }),
      csvLine({ email: parentEmail, childName: "Bob", age: "10" }),
    );

    await page.goto(tenantUrl(slug, "/en/dashboard/import"));
    await page.getByLabel("CSV file").setInputFiles({
      name: "import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import" }).click();

    await expect(page.getByText(/Successfully imported 2 rows/)).toBeVisible();

    const state = await getLanglionState(request, { orgSlug: slug });
    expect(state.clients).toHaveLength(1);
    expect(state.clients[0]!.email).toBe(parentEmail);
    expect(state.athletes).toHaveLength(2);
  });

  test("US-39.2/AC1 — wierszowa walidacja: poprawne zaimportowane, błędne w raporcie", async ({
    page,
    request,
  }) => {
    const { ownerEmail, slug } = await seedAcademy(request, "imp3");
    await loginAndLand(page, slug, ownerEmail);

    const validEmail = uniqueEmail("parok");

    const csv = csvFile(
      HEADER,
      csvLine({ email: validEmail, childName: "Alice", age: "10" }),
      csvLine({ email: "not-an-email", childName: "Bad" }),
      csvLine({ email: uniqueEmail("par2"), parentName: "Parent 2" }),
    );

    await page.goto(tenantUrl(slug, "/en/dashboard/import"));
    await page.getByLabel("CSV file").setInputFiles({
      name: "import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import" }).click();

    await expect(page.getByText(/Imported 1 of 2 rows/)).toBeVisible();
    await expect(page.getByText(/invalid_email/)).toBeVisible();
    await expect(page.getByText(/missing_required_field/)).toBeVisible();

    const state = await getLanglionState(request, { orgSlug: slug });
    expect(state.clients).toHaveLength(1);
    expect(state.clients[0]!.email).toBe(validEmail);
  });

  test("US-39.4/AC1 — użytkownik bez data.import dostaje odrzucenie", async ({
    page,
    request,
  }) => {
    const { trainerEmail, slug } = await seedAcademy(request, "imp4");
    await loginAndLand(page, slug, trainerEmail);

    const res = await page.goto(tenantUrl(slug, "/en/dashboard/import"));
    expect(res?.status()).toBe(403);
  });
});
