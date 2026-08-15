import { expect, test } from "./rate-limit-fixtures";
import type { APIRequestContext, Page } from "@playwright/test";

import { loginViaUi, registerViaApi, seedOrg, TEST_PASSWORD, uniqueEmail } from "./helpers";
import { tenantOrigin, tenantUrl } from "./host-fixtures";

/**
 * Staff session handoff across the apex → tenant host switch (plan Faza 5.5
 * / F5.6, decyzja D74). §2.19 exception #5's cookie is host-scoped by design
 * and stays untouched here — this bridges an ALREADY-authenticated session
 * across the host switch using a short-lived, single-use token, not a shared
 * cookie.
 *
 * Every academy-directory link points at the apex `start` endpoint, which mints
 * the token at CLICK time and forwards to the tenant host's verify endpoint;
 * only the verify endpoint may consume a token. All direct-API assertions below
 * go through the `request` fixture (a plain `APIRequestContext`, no cookie jar
 * shared with `page`'s browser context) — the same convention
 * `langlion-client-auth.spec.ts` uses for the OTP race test this one mirrors.
 * Minting, by contrast, needs the apex session, so `start` is driven through
 * `page.request`, which shares the browser context's cookie jar.
 */

async function handoffState(
  request: APIRequestContext,
  subdomain: string,
): Promise<{ live: number; consumed: number }> {
  const res = await request.get(`/api/dev/staff-handoff?subdomain=${subdomain}`);
  expect(res.ok(), `handoffState failed: ${await res.text()}`).toBe(true);
  return (await res.json()) as { live: number; consumed: number };
}

async function expireHandoffs(request: APIRequestContext, subdomain: string): Promise<number> {
  const res = await request.post("/api/dev/staff-handoff", {
    data: { subdomain, action: "expire" },
  });
  expect(res.ok(), `expireHandoffs failed: ${await res.text()}`).toBe(true);
  return ((await res.json()) as { expired: number }).expired;
}

/** Create an org via the real UI and return its directory link's start href. */
async function createOrgAndCaptureStartLink(
  page: Page,
  name: string,
): Promise<{ subdomain: string; startHref: string }> {
  const slug = `handoff-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await page.goto("/orgs/new");
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("Slug (optional)").fill(slug);
  await page.getByLabel("Subdomain").fill(slug);
  await page.getByRole("button", { name: /create organization/i }).click();
  await page.waitForURL("**/dashboard**");

  // The directory mints nothing up front (F5.6): every link points at the apex
  // `start` endpoint, which mints the token on click.
  const link = page.getByRole("link", { name });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  if (!href) throw new Error("directory link has no href");
  expect(href).toContain("/api/auth/staff-handoff/start?subdomain=");
  return { subdomain: slug, startHref: new URL(href, page.url()).toString() };
}

/**
 * Mint a token through the real `start` endpoint and return the verify URL it
 * hands off to. `page.request` carries the browser context's apex session, so
 * `start`'s own session gate passes without a second login.
 */
async function resolveVerifyUrl(page: Page, startHref: string): Promise<string> {
  const res = await page.request.get(startHref, { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(res.status());
  const location = res.headers()["location"] ?? "";
  expect(location).toContain("/api/auth/staff-handoff/verify?token=");
  return location;
}

test("clicking the directory link lands signed in on the academy host, no login screen", async ({
  page,
  request,
}) => {
  const owner = uniqueEmail("handoff-happy");
  await registerViaApi(request, owner);
  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  const { subdomain, startHref } = await createOrgAndCaptureStartLink(page, "Handoff Co");

  // The full chain: apex `start` → tenant `verify` → tenant `/dashboard`.
  await page.goto(startHref);
  await page.waitForURL(`${tenantOrigin(subdomain)}/**/dashboard`);
  // Bare `/dashboard`, no leftover `?token=` — the token must not survive into
  // history/referrer.
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/your role:/i)).toBeVisible();
});

test("a later re-visit to an existing academy bridges without a login screen", async ({
  page,
  request,
}) => {
  const owner = uniqueEmail("handoff-revisit");
  await registerViaApi(request, owner);
  // An academy the user joined some time ago — NOT one created this session.
  const { subdomain } = await seedOrg(request, { ownerEmail: owner, name: "Old Academy" });

  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  // The pre-existing academy appears in the directory and bridges like a fresh
  // one — this is the regression F5.6 fixes: a plain `{subdomain}/dashboard`
  // link would land on that host's login screen.
  const link = page.getByRole("link", { name: "Old Academy" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  if (!href) throw new Error("directory link has no href");
  expect(href).toContain("/api/auth/staff-handoff/start?subdomain=");
  const startHref = new URL(href, page.url()).toString();

  await page.goto(startHref);
  await page.waitForURL(`${tenantOrigin(subdomain)}/**/dashboard`);
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/your role:/i)).toBeVisible();
});

test("a token used twice in parallel wins exactly once", async ({ page, request }) => {
  const owner = uniqueEmail("handoff-race");
  await registerViaApi(request, owner);
  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  const { subdomain, startHref } = await createOrgAndCaptureStartLink(page, "Race Co");
  const verifyHref = await resolveVerifyUrl(page, startHref);

  /*
   * THE TEST FOR DECYZJA D74's ATOMIC UPDATE, same shape as the OTP race test
   * (D38). Fired together via `request` (no cookie jar), so neither call can
   * observe the other's Set-Cookie before both are already in flight — exactly
   * the interleaving a transaction alone does not prevent.
   */
  const [first, second] = await Promise.all([
    request.get(verifyHref, { maxRedirects: 0 }),
    request.get(verifyHref, { maxRedirects: 0 }),
  ]);
  const winners = [first, second].filter((res) => Boolean(res.headers()["set-cookie"]));
  expect(winners, "exactly one winner sets a cookie").toHaveLength(1);

  const state = await handoffState(request, subdomain);
  expect(state.consumed).toBe(1);
  expect(state.live).toBe(0);
});

test("an expired token falls back to login quietly, not an error page", async ({
  page,
  request,
}) => {
  const owner = uniqueEmail("handoff-expiry");
  await registerViaApi(request, owner);
  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  const { subdomain, startHref } = await createOrgAndCaptureStartLink(page, "Expiry Co");
  const verifyHref = await resolveVerifyUrl(page, startHref);
  expect(await expireHandoffs(request, subdomain)).toBe(1);

  const res = await request.get(verifyHref, { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(res.status());
  const location = res.headers()["location"] ?? "";
  expect(location).toContain("/login");
  expect(location).not.toContain("error");
});

test("a prefetch request does not consume the token", async ({ page, request }) => {
  const owner = uniqueEmail("handoff-prefetch");
  await registerViaApi(request, owner);
  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  const { subdomain, startHref } = await createOrgAndCaptureStartLink(page, "Prefetch Co");
  const verifyHref = await resolveVerifyUrl(page, startHref);

  const prefetchRes = await request.get(verifyHref, {
    headers: { "sec-purpose": "prefetch" },
    maxRedirects: 0,
  });
  expect(prefetchRes.status()).toBe(204);

  const stateAfterPrefetch = await handoffState(request, subdomain);
  expect(stateAfterPrefetch.live, "prefetch must not consume the token").toBe(1);

  // The real click still works afterwards.
  const realRes = await request.get(verifyHref, { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(realRes.status());
  expect(realRes.headers()["location"] ?? "").toContain("/dashboard");
});

test("a token is refused on any host other than the one it was minted for", async ({
  page,
  request,
}) => {
  const owner = uniqueEmail("handoff-crossorg");
  await registerViaApi(request, owner);
  await page.goto("/login");
  await loginViaUi(page, owner, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");

  const { startHref } = await createOrgAndCaptureStartLink(page, "Cross Org A");
  const verifyHref = await resolveVerifyUrl(page, startHref);

  // Same token, replayed against an UNRELATED academy's host.
  const { subdomain: otherSubdomain } = await seedOrg(request, {
    ownerEmail: owner,
    name: "Cross Org B",
  });
  const token = new URL(verifyHref).searchParams.get("token");
  const foreignVerifyUrl = tenantUrl(
    otherSubdomain,
    `/api/auth/staff-handoff/verify?token=${token}`,
  );

  const res = await request.get(foreignVerifyUrl, { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(res.status());
  expect(res.headers()["location"] ?? "").toContain("/login");
});
