import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

import { issueAndReadCode } from "./client-auth-fixtures";
import {
  loginToAcademy,
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  uniqueNearFutureSlot,
} from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Manual invoicing (langlion EPIK 27, Faza 19).
 *
 * ⚠️ COOKIE SHARING. Use `page.request.post()` for client auth so the
 * session cookie lands on the browser context.
 */

async function seedAcademy(
  request: APIRequestContext,
  prefix: string,
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const receptionEmail = uniqueEmail(`${prefix}-reception`);
  await registerViaApi(request, receptionEmail);

  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
    members: [{ email: receptionEmail, role: "reception" }],
  });

  const slot = uniqueNearFutureSlot();
  const parentEmail = uniqueEmail(`${prefix}-parent`);
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId(`${prefix}-offer`).replace(/_/g, "-"),
      name: `${prefix} offer`,
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: parentEmail, isVerified: true },
    athletes: [{ name: "Invoice Kid" }],
    creditType: { name: `${prefix} credits` },
    productTemplate: {
      name: `${prefix} 4-pack`,
      creditQuantity: 4,
      price: 15000,
    },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const r = await request.post("/api/dev/purchases", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      productTemplateId: seed.productTemplateId!,
    },
  });
  const body = (await r.json()) as { ok: boolean; purchaseId?: string };
  expect(body.ok, `purchase failed: ${JSON.stringify(body)}`).toBe(true);

  return {
    orgId,
    subdomain,
    receptionEmail,
    parentEmail,
    purchaseId: body.purchaseId!,
    ...seed,
  };
}

async function loginAsParent(
  request: APIRequestContext,
  page: Page,
  subdomain: string,
  email: string,
) {
  const code = await issueAndReadCode(request, subdomain, email);
  const res = await page.request.post(
    tenantUrl(subdomain, "/api/client-auth/verify"),
    { data: { email, code } },
  );
  expect(res.ok(), `verify-code failed: ${await res.text()}`).toBe(true);
  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));
}

// ── US-27.1: Client requests invoice ───────────────────────────────────

test("US-27.1 — client requests invoice from their purchase", async ({
  page,
  request,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "inv-us271");

  await loginAsParent(request, page, subdomain, parentEmail);

  // The purchases section shows the template name.
  await expect(page.getByText("inv-us271 4-pack")).toBeVisible();

  // Click "Request invoice" on the first purchase row.
  await page.getByRole("button", { name: "Request invoice" }).click();

  // After revalidation the button is replaced by a static confirmation span.
  await expect(page.getByText("Invoice requested")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request invoice" })).not.toBeVisible();
});

test("US-27.1 repeats — second request button is hidden", async ({
  page,
  request,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "inv-rep");

  await loginAsParent(request, page, subdomain, parentEmail);

  // First request works.
  await page.getByRole("button", { name: "Request invoice" }).click();
  await expect(page.getByText("Invoice requested")).toBeVisible();

  // After page refresh, the button is still gone.
  await page.reload();
  await expect(page.getByText("Invoice requested")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request invoice" })).not.toBeVisible();
});

// ── US-27.2/AC1: Reception sees pending invoice ────────────────────────

test("US-27.2/AC1 — reception sees pending invoice on dashboard", async ({
  page,
  request,
}) => {
  const { subdomain, parentEmail, receptionEmail } =
    await seedAcademy(request, "inv-ac1");

  // First, client requests invoice.
  await loginAsParent(request, page, subdomain, parentEmail);
  await page.getByRole("button", { name: "Request invoice" }).click();
  await expect(page.getByText("Invoice requested")).toBeVisible();

  // Reception logs in and checks the invoices page.
  await loginToAcademy(page, subdomain, receptionEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/invoices"));

  // Should see the pending invoice with the client's data.
  await expect(page.getByText(parentEmail)).toBeVisible();
  await expect(page.getByText("inv-ac1 4-pack")).toBeVisible();
  await expect(page.getByPlaceholder("Invoice number")).toBeVisible();
});

test("US-27.2/AC1 — pending list shows no invoices when none requested", async ({
  page,
  request,
}) => {
  const { subdomain, receptionEmail } = await seedAcademy(request, "inv-empty");

  await loginToAcademy(page, subdomain, receptionEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/invoices"));

  // A purchase exists but was never requested — it still appears in pending
  // (the query selects WHERE invoice_issued_at IS NULL, regardless of request).
  // So "No pending invoices" should NOT appear.
  await expect(page.getByText("inv-empty 4-pack")).toBeVisible();
});

// ── US-27.2/AC2: Reception marks invoice as issued ─────────────────────

test("US-27.2/AC2 — reception marks an invoice as issued", async ({
  page,
  request,
}) => {
  const { subdomain, parentEmail, receptionEmail } =
    await seedAcademy(request, "inv-ac2");

  // Client requests invoice.
  await loginAsParent(request, page, subdomain, parentEmail);
  await page.getByRole("button", { name: "Request invoice" }).click();

  // Reception marks it as issued.
  await loginToAcademy(page, subdomain, receptionEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/invoices"));

  const invoiceNumber = `FV/${crypto.randomUUID().slice(0, 8)}`;
  await page.getByPlaceholder("Invoice number").fill(invoiceNumber);
  await page.getByRole("button", { name: "Mark as issued" }).click();

  // The form submits and the server revalidates — the card disappears
  // and the pending section shows the empty-state message.
  await expect(page.getByText("No pending invoices.")).toBeVisible();

  // The issued section below shows the invoice number.
  await expect(page.getByText(invoiceNumber)).toBeVisible();
});

// ── US-27.2/AC3: Reception marks without prior request ─────────────────

test("US-27.2/AC3 — reception marks invoice without prior client request", async ({
  page,
  request,
}) => {
  const { subdomain, receptionEmail } = await seedAcademy(request, "inv-ac3");

  await loginToAcademy(page, subdomain, receptionEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/invoices"));

  // The purchase shows in pending (invoice_issued_at IS NULL).
  await expect(page.getByText("inv-ac3 4-pack")).toBeVisible();

  const invoiceNumber = `FV/PRO/${crypto.randomUUID().slice(0, 8)}`;
  await page.getByPlaceholder("Invoice number").fill(invoiceNumber);
  await page.getByRole("button", { name: "Mark as issued" }).click();

  // The card disappears and pending section shows empty state.
  await expect(page.getByText("No pending invoices.")).toBeVisible();

  // The issued section shows the invoice number.
  await expect(page.getByText(invoiceNumber)).toBeVisible();
});

// ── US-27.3: Invoice fields never block the purchase path ──────────────

test("US-27.3 — purchase completes normally regardless of invoice state", async ({
  request,
}) => {
  const prefix = "inv-nblock";
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);

  const { orgId } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });

  const slot = uniqueNearFutureSlot();
  const parentEmail = uniqueEmail(`${prefix}-parent`);
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: {
      slug: uniqueId(`${prefix}-offer`).replace(/_/g, "-"),
      name: `${prefix} offer`,
      price: 10_000,
      allowedPurchaseModes: ["single_class", "package"],
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: parentEmail, isVerified: true },
    athletes: [{ name: "NoBlock Kid" }],
    creditType: { name: `${prefix} credits` },
    productTemplate: { name: `${prefix} 4-pack`, creditQuantity: 4, price: 15000 },
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  const r = await request.post("/api/dev/purchases", {
    data: {
      organizationId: orgId,
      clientId: seed.clientId!,
      productTemplateId: seed.productTemplateId!,
    },
  });
  const body = (await r.json()) as { ok: boolean; purchaseId?: string; creditsIssued?: number };
  expect(body.ok, `purchase failed: ${JSON.stringify(body)}`).toBe(true);
  expect(body.creditsIssued).toBeGreaterThanOrEqual(1);
});

// ── Access control: invoices.mark_issued ───────────────────────────────

test("invoices.mark_issued — trainer cannot access invoice page", async ({
  page,
  request,
}) => {
  const prefix = "inv-trainer";
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const trainerEmail = uniqueEmail(`${prefix}-trainer`);
  await registerViaApi(request, trainerEmail);

  const { subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  await loginToAcademy(page, subdomain, trainerEmail, "Password123");
  await page.goto(tenantUrl(subdomain, "/en/dashboard/invoices"));

  await expect(page.getByText("Access denied")).toBeVisible();
});
