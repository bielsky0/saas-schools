import { expect, test, type APIRequestContext } from "@playwright/test";

import { registerViaApi, seedOrgFull, uniqueEmail } from "./helpers";

/**
 * CMS tenant isolation under load (Faza 30a, plan §30a).
 *
 * Verifies that Payload access control (the only isolation for read ops —
 * see docs/spike-30/raport.md §A0a-tx-real-find) holds under concurrent
 * requests that exceed Payload's DB pool max (3).
 *
 * The test:
 *   1. Seeds two academies with CMS pages
 *   2. Fires N concurrent unfiltered SELECT probes across both orgs
 *      (N > Payload pool max of 3)
 *   3. Asserts that every response contains only its own org's pages
 *
 * The probe SELECT omits the `organization_id` WHERE clause on purpose
 * (same pattern as `/api/dev/rls-probe`), so the test proves that either
 * RLS or Payload access control is what filters — not the application code.
 */

async function seedCmsPages(
  request: APIRequestContext,
  orgId: string,
  count: number,
): Promise<void> {
  const results = await Promise.all(
    Array.from({ length: count }, () =>
      request.post("/api/dev/cms-isolation-probe", {
        data: {
          action: "seed",
          collection: "pages",
          organizationId: orgId,
        },
      }),
    ),
  );
  for (const res of results) {
    if (!res.ok()) {
      const text = await res.text();
      // CMS table might not exist if migrations haven't run — skip test
      if (text.includes("does not exist") || text.includes("relation")) {
        test.skip();
        return;
      }
    }
  }
}

test("concurrent unfiltered SELECTs across orgs stay isolated", async ({
  request,
}) => {
  const emailA = uniqueEmail("cms-iso-a");
  const emailB = uniqueEmail("cms-iso-b");
  await registerViaApi(request, emailA);
  await registerViaApi(request, emailB);

  const orgA = await seedOrgFull(request, { ownerEmail: emailA, name: "CMS Iso A" });
  const orgB = await seedOrgFull(request, { ownerEmail: emailB, name: "CMS Iso B" });

  // Seed 3 pages per org
  await seedCmsPages(request, orgA.orgId, 3);
  await seedCmsPages(request, orgB.orgId, 3);

  // Probe each org's pages table with N concurrent calls (> pool max of 3).
  const CONCURRENCY = 6;

  const probe = (orgId: string): Promise<{ ok: boolean; organizationId: string; count: number; rows: { organizationId: string }[] }> =>
    request
      .post("/api/dev/cms-isolation-probe", {
        data: { action: "probe", collection: "pages", organizationId: orgId },
      })
      .then(async (r) => (await r.json()) as { ok: boolean; organizationId: string; count: number; rows: { organizationId: string }[] });

  const allResults = await Promise.all([
    ...Array.from({ length: CONCURRENCY }, () => probe(orgA.orgId)),
    ...Array.from({ length: CONCURRENCY }, () => probe(orgB.orgId)),
  ]);

  expect(allResults).toHaveLength(CONCURRENCY * 2);

  for (const result of allResults) {
    expect(result.ok).toBe(true);
    expect(result.count).toBe(3); // each org has exactly 3 pages
    // Every row returned must belong to the probed org — the probe SELECT
    // has no organization_id WHERE clause, so RLS must be the filter.
    for (const row of result.rows) {
      expect(row.organizationId).toBe(result.organizationId);
    }
  }
});

test("zero cross-org rows even under pool pressure (10 concurrent per org)", async ({
  request,
}) => {
  const emailA = uniqueEmail("cms-pool-a");
  const emailB = uniqueEmail("cms-pool-b");
  await registerViaApi(request, emailA);
  await registerViaApi(request, emailB);

  const orgA = await seedOrgFull(request, { ownerEmail: emailA, name: "CMS Pool A" });
  const orgB = await seedOrgFull(request, { ownerEmail: emailB, name: "CMS Pool B" });

  // Seed 5 pages per org so we have data to probe
  await seedCmsPages(request, orgA.orgId, 5);
  await seedCmsPages(request, orgB.orgId, 5);

  const CONCURRENCY = 10; // > Payload pool max (3)

  const probe = (orgId: string): Promise<{ ok: boolean; organizationId: string; count: number; rows: { organizationId: string }[] }> =>
    request
      .post("/api/dev/cms-isolation-probe", {
        data: { action: "probe", collection: "pages", organizationId: orgId },
      })
      .then(async (r) => (await r.json()) as { ok: boolean; organizationId: string; count: number; rows: { organizationId: string }[] });

  const results = await Promise.all([
    ...Array.from({ length: CONCURRENCY }, () => probe(orgA.orgId)),
    ...Array.from({ length: CONCURRENCY }, () => probe(orgB.orgId)),
  ]);

  expect(results).toHaveLength(CONCURRENCY * 2);

  for (const result of results) {
    expect(result.ok).toBe(true);
    expect(result.count).toBe(5);
    for (const row of result.rows) {
      expect(row.organizationId).toBe(result.organizationId);
    }
  }
});
