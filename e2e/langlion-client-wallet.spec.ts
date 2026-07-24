import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

import { issueAndReadCode } from "./client-auth-fixtures";
import { issueCredits, seedCreditType } from "./credits-fixtures";
import {
  getUserId,
  loginToAcademy,
  registerViaApi,
  seedLanglion,
  seedOrgFull,
  uniqueEmail,
  uniqueNearFutureSlot,
  waitForEmail,
} from "./helpers";
import { uniqueId } from "./billing-fixtures";
import { tenantUrl, uniqueSubdomain } from "./host-fixtures";

/**
 * Client wallet and grades panel (plan Faza 13 — Portfel klienta UI).
 *
 * These tests verify that the client panel at `/moje-zajecia` shows the wallet
 * section only when credits exist (US-7.6) and the grades & progress section
 * only when grade/note entries exist (US-35.6).
 *
 * Every test seeds its own academy so no parallel run can interfere.
 *
 * ⚠️ COOKIE SHARING. The `request` fixture and `page` have separate cookie
 * stores. Data seeding (which needs no auth) uses the bare `request` fixture.
 * Client authentication (`verifyCode`) MUST use `page.request.post()` so the
 * session cookie lands on the page's browser context — otherwise the page
 * would navigate to `/moje-zajecia` as a stranger.
 */

async function seedAcademy(
  request: APIRequestContext,
  prefix: string,
  opts: {
    athletes?: number;
    isVerified?: boolean;
    paymentStatus?: string;
  } = {},
) {
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });

  const offerSlug = uniqueId(`${prefix}-offer`).replace(/_/g, "-");
  const slot = uniqueNearFutureSlot(7);
  const parentEmail = uniqueEmail(`${prefix}-parent`);
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    groupType: { slug: offerSlug, name: `${prefix} offer` },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: parentEmail, isVerified: opts.isVerified ?? true },
    athletes: Array.from(
      { length: opts.athletes ?? 1 },
      (_, i) => ({ name: `Child ${i + 1}` }),
    ),
    bookings:
      opts.athletes !== 0
        ? [
            {
              sessionIndex: 0,
              athleteIndex: 0,
              paymentStatus: opts.paymentStatus ?? "confirmed",
            },
          ]
        : undefined,
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  return { orgId, subdomain, parentEmail, ...seed };
}

/**
 * Authenticate as parent via the browser's own request context so the session
 * cookie is available when the page navigates.
 */
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

test("US-7.6/AC1+AC4: wallet section hidden when no credits exist; upcoming classes always visible", async ({
  request,
  page,
}) => {
  const { subdomain, parentEmail } = await seedAcademy(request, "ac1");

  await loginAsParent(request, page, subdomain, parentEmail);

  await expect(
    page.getByRole("heading", { name: "Credit wallet" }),
  ).not.toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Session" }),
  ).toBeVisible();
});

test("US-7.6/AC2: wallet shows credits with individual source and expiry date", async ({
  request,
  page,
}) => {
  const { orgId, subdomain, clientId, parentEmail } =
    await seedAcademy(request, "ac2");

  const groupTypeId = await (async () => {
    const res = await seedLanglion(request, {
      organizationId: orgId,
      groupType: {
        slug: uniqueId("ac2-ct").replace(/_/g, "-"),
        name: "AC2 credit type",
      },
      sessions: [
        {
          startsAt: new Date("2400-01-01").toISOString(),
          endsAt: new Date("2400-01-01T01:00:00").toISOString(),
        },
      ],
    });
    expect(res.ok, `group type seed failed: ${res.message ?? res.sqlState}`).toBe(
      true,
    );
    return res.groupTypeId!;
  })();
  const creditTypeId = await seedCreditType(request, {
    organizationId: orgId,
    groupTypeId,
    name: "AC2 Credit Type",
  });

  await issueCredits(request, {
    organizationId: orgId,
    clientId: clientId!,
    creditTypeId,
    quantity: 2,
    source: "package_cash",
  });
  await issueCredits(request, {
    organizationId: orgId,
    clientId: clientId!,
    creditTypeId,
    quantity: 1,
    source: "cancellation",
  });

  await loginAsParent(request, page, subdomain, parentEmail);

  const walletHeading = page.getByRole("heading", { name: "Credit wallet" });
  await expect(walletHeading).toBeVisible();

  const tableRows = page
    .locator("section")
    .filter({ has: walletHeading })
    .locator("table tbody tr");
  await expect(tableRows).toHaveCount(3);
});

test("US-7.6/AC3: online payment does not make wallet visible", async ({
  request,
  page,
}) => {
  const { orgId, subdomain, clientId, parentEmail } =
    await seedAcademy(request, "ac3");

  const groupTypeId = await (async () => {
    const res = await seedLanglion(request, {
      organizationId: orgId,
      groupType: {
        slug: uniqueId("ac3-ct").replace(/_/g, "-"),
        name: "AC3 credit type",
      },
      sessions: [
        {
          startsAt: new Date("2400-01-01").toISOString(),
          endsAt: new Date("2400-01-01T01:00:00").toISOString(),
        },
      ],
    });
    expect(res.ok, `group type seed failed: ${res.message ?? res.sqlState}`).toBe(
      true,
    );
    return res.groupTypeId!;
  })();
  const creditTypeId = await seedCreditType(request, {
    organizationId: orgId,
    groupTypeId,
  });

  const past = new Date(Date.now() - 86_400_000).toISOString();
  await issueCredits(request, {
    organizationId: orgId,
    clientId: clientId!,
    creditTypeId,
    quantity: 1,
    source: "online_payment",
    validUntil: past,
  });

  await loginAsParent(request, page, subdomain, parentEmail);

  await expect(
    page.getByRole("heading", { name: "Credit wallet" }),
  ).not.toBeVisible();
});

test("US-35.6: grades section shows when entries exist, hidden otherwise", async ({
  request,
  page,
}) => {
  const prefix = "grade-ui";
  const ownerEmail = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, ownerEmail);
  const trainerEmail = uniqueEmail(`${prefix}-trainer`);
  await registerViaApi(request, trainerEmail);
  const trainerId = await getUserId(request, trainerEmail);

  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
    members: [{ email: trainerEmail, role: "trainer" }],
  });

  const slot = uniqueNearFutureSlot(8);
  const parentEmail = uniqueEmail(`${prefix}-parent`);
  const seed = await seedLanglion(request, {
    organizationId: orgId,
    trainerId,
    groupType: {
      slug: uniqueId(`${prefix}-offer`).replace(/_/g, "-"),
      name: `${prefix} offer`,
    },
    sessions: [{ startsAt: slot.startsAt, endsAt: slot.endsAt, capacity: 8 }],
    client: { email: parentEmail, isVerified: true },
    athletes: [{ name: "Graded Kid" }],
    bookings: [
      { sessionIndex: 0, athleteIndex: 0, paymentStatus: "confirmed" },
    ],
    // Grade field is created through the UI below, not seeded.
  });
  expect(seed.ok, `seed failed: ${seed.message ?? seed.sqlState}`).toBe(true);

  await loginAsParent(request, page, subdomain, parentEmail);

  await expect(
    page.getByRole("heading", { name: "Grades & progress" }),
  ).not.toBeVisible();

  await loginToAcademy(page, subdomain, trainerEmail, "Password123");
  await page.goto(
    tenantUrl(subdomain, `/en/dashboard/sessions/${seed.sessionIds![0]}`),
  );

  await page.getByLabel("Field name").fill("Uwagi trenera");
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(page.getByText("Grade field created.")).toBeVisible();
  await page.reload();
  await page.getByLabel("Value").fill("Bardzo dobrze");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Grade saved.")).toBeVisible();

  const mail = await waitForEmail(request, parentEmail, "grade-recorded");
  expect(mail.to).toBe(parentEmail);

  await page.goto(tenantUrl(subdomain, "/en/moje-zajecia"));

  const gradesHeading = page.getByRole("heading", {
    name: "Grades & progress",
  });
  await expect(gradesHeading).toBeVisible();
  await expect(page.getByText("Bardzo dobrze")).toBeVisible();
});
