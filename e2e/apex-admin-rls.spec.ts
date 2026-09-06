import { expect, test } from "@playwright/test";

import { rlsProbe } from "./helpers";

/**
 * Apex dashboard RLS (docs/apex-dashboard-plan.md, Faza 0 §0.13).
 *
 * The Faza 0+1 GLOBAL tables (`admin_*`) are built differently from tenant
 * tables: they carry NO permissive SELECT policy and NO tenant-isolation policy.
 * Their only policy is the system bypass (`app.bypass_rls`), so fail-closed for
 * a tenant session is structural — an unscoped `db` call sees zero rows because
 * no policy lets it see anything. `page_version` instead isolates through a
 * subquery against the parent `page.organizationId` (migration 0089).
 *
 * What can be asserted through /api/dev/rls-probe is the environment half: RLS
 * is ON and FORCE for every new table (so the migration role — the table owner
 * — is not exempt). The row-level window cannot be probed here because the
 * probe's read shape mirrors `(organizationId, accountId)` owner columns that a
 * GLOBAL table has no reason to have; a dedicated isolation probe can be added
 * alongside the Faza 2/3 UI.
 *
 * Faza 5 addition: `admin_client_group_limit_value` (migration 0091) — group
 * limit overrides are bypass-only rows exactly like `admin_feature_flag_value`.
 */

const ADMIN_TABLES = [
  "admin_client_group",
  "admin_client_group_member",
  "admin_client_group_limit_value",
  "admin_feature_flag",
  "admin_feature_flag_value",
  "admin_coupon",
  "admin_coupon_redemption",
  "admin_client_setting_override",
  "page_version",
];

test.describe("apex admin RLS environment", () => {
  test("every new apex table has RLS enabled and forced", async ({ request }) => {
    const probe = await rlsProbe(request, { mode: "raw" });
    const byName = new Map(probe.environment.tables.map((t) => [t.relname, t]));

    for (const name of ADMIN_TABLES) {
      const row = byName.get(name);
      expect(row, `${name} is missing`).toBeDefined();
      expect(row!.relrowsecurity, `${name} has no RLS`).toBe(true);
      expect(row!.relforcerowsecurity, `${name} has RLS but not FORCE`).toBe(true);
    }
  });
});