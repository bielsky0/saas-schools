import { eq, inArray } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";
import type { TenantDb } from "@/lib/db/tenant";
import { adminClientGroup, adminClientGroupLimitValue, adminClientGroupMember } from "@/lib/db/schema";

import type { LimitKey } from "@/features/billing/limits";

/**
 * Cross-tenant limits data layer (apex-dashboard-plan Faza 5, §5.1).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every read
 * here crosses tenants. `admin_client_group_limit_value` is a GLOBAL table whose
 * only RLS policy is the system bypass (migration 0091) — a tenant session must
 * not see another org's cap overrides, so these reads cannot run under a tenant
 * GUC. The module is enumerated in eslint.config.mjs next to `groups.ts`.
 *
 * All exported functions are reachable only behind `requireSuperAdmin()`.
 */

/** One group limit override row, joined with the group's name. */
export type GroupLimitRow = {
  groupId: string;
  groupName: string;
  limitKey: string;
  /** null = unlimited (explicit). */
  limitValue: number | null;
  createdAt: Date;
};

/** All group limit override rows across every group (for /admin/limits matrix). */
export async function listGroupLimits(): Promise<GroupLimitRow[]> {
  return withSystemBypass("super admin: group limits list", (tx) =>
    tx
      .select({
        groupId: adminClientGroupLimitValue.groupId,
        groupName: adminClientGroup.name,
        limitKey: adminClientGroupLimitValue.limitKey,
        limitValue: adminClientGroupLimitValue.limitValue,
        createdAt: adminClientGroupLimitValue.createdAt,
      })
      .from(adminClientGroupLimitValue)
      .innerJoin(adminClientGroup, eq(adminClientGroupLimitValue.groupId, adminClientGroup.id))
      .orderBy(adminClientGroup.name, adminClientGroupLimitValue.limitKey),
  );
}

/**
 * The resolved group limit per known key for one org — what `getEffectiveLimit`
 * would pick from the group tier (before org/plan resolution). Used by the
 * org-console limits diff view to show the group source row. Returns only keys
 * that actually carry a group override; `Record`-shape so callers can merge with
 * org overrides/plan values per key.
 */
export async function getOrgGroupLimitValues(
  orgId: string,
): Promise<Partial<Record<LimitKey, number | null>>> {
  return withSystemBypass("super admin: org's group limit values", async (tx) => {
    const values = await resolveOrgGroupValues(tx, orgId);
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value as number | null]),
    ) as Partial<Record<LimitKey, number | null>>;
  });
}

/**
 * Resolve the effective group-tier value for EVERY limit key of an org, in one
 * bypass transaction. Used by the runtime path (`billing/limits.ts`) and by the
 * admin diff view. `tx` must already be a bypass transaction.
 */
export async function resolveOrgGroupValues(
  tx: TenantDb,
  orgId: string,
): Promise<Partial<Record<string, number | null>>> {
  const groupIds = (
    await tx
      .select({ groupId: adminClientGroupMember.groupId })
      .from(adminClientGroupMember)
      .where(eq(adminClientGroupMember.organizationId, orgId))
  ).map((r) => r.groupId);

  const out: Record<string, number | null> = {};
  if (groupIds.length === 0) return out;

  const rows = await tx
    .select({ limitKey: adminClientGroupLimitValue.limitKey, limitValue: adminClientGroupLimitValue.limitValue })
    .from(adminClientGroupLimitValue)
    .where(inArray(adminClientGroupLimitValue.groupId, groupIds));

  for (const row of rows) {
    const current = out[row.limitKey];
    const candidate = row.limitValue;
    if (current === undefined) {
      out[row.limitKey] = candidate;
    } else if (candidate === null || ((current !== null) && (current < candidate))) {
      // null (unlimited) wins; otherwise highest value wins.
      out[row.limitKey] = candidate;
    }
  }
  return out;
}