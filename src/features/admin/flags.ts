/**
 * Feature-flag inheritance engine (apex-dashboard-plan Faza 0, §0.10).
 *
 * Resolution order per organization: org override → group override → global
 * default → fail-closed `false`. "No override row" means *inherit*, never *off*
 * — a missing value is indistinguishable from an unset scope on purpose.
 *
 * The pure resolution rules live in `./flags-resolution` (db-free, unit-tested);
 * this module wraps them in database reads.
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every one of
 * these reads is cross-tenant. `admin_feature_flag*` and
 * `admin_client_group_member` are GLOBAL tables whose only RLS policy is the
 * system bypass (migrations 0085–0086) — a tenant session must not see another
 * org's overrides or group memberships, so reads here cannot run under a tenant
 * GUC. The module is enumerated in eslint.config.mjs next to
 * `features/admin/data.ts` for the same reason.
 *
 * conditionMet runs usage counts on the SAME bypass transaction (not on the
 * global `db`), because the tenant RLS policies read a transaction-scoped GUC
 * and a bare `db` call opens a separate connection that would see nothing.
 */
import { and, count, countDistinct, eq, gte, inArray, isNull } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";
import type { TenantDb } from "@/lib/db/tenant";
import {
  adminClientGroupMember,
  adminFeatureFlag,
  adminFeatureFlagValue,
} from "@/lib/db/schema";

import {
  conditionSatisfied,
  resolveEffectiveFlag,
  resolveGroupValue,
} from "./flags-resolution";

export {
  conditionSatisfied,
  resolveEffectiveFlag,
  resolveGroupValue,
} from "./flags-resolution";

type FeatureFlagRow = typeof adminFeatureFlag.$inferSelect;

/** A single overridden cell in the /admin/feature-flags matrix. */
export type MatrixGroupCell = {
  groupId: string;
  groupName: string;
  enabled: boolean | null;
};

/** One row of the matrix — the flag plus its effective sources per column. */
export type FeatureFlagMatrixRow = {
  flag: FeatureFlagRow;
  /** Global column — the dictionary's base value. */
  enabledGlobal: boolean;
  /** Group column — blank ([]) when the flag has no per-group overrides. */
  groupOverrides: MatrixGroupCell[];
  /** Org column when a specific tenant is selected (matrix callers may pass
   * `orgId`); otherwise null and the org column renders "—". */
  orgOverride: boolean | null;
  /** Whether the flag's `condition` is satisfied for the selected org. */
  conditionMatched: boolean;
};

/** Effective enabled state for one org + one flag key, fail-closed. */
export async function hasFeature(orgId: string, featureKey: string): Promise<boolean> {
  return withSystemBypass("flags: hasFeature", async (tx) => {
    const [flag] = await tx
      .select()
      .from(adminFeatureFlag)
      .where(eq(adminFeatureFlag.key, featureKey))
      .limit(1);
    if (!flag) return false;

    if (flag.condition) {
      const usage = await countMetric(tx, orgId, flag.condition.metric);
      if (!conditionSatisfied(usage, flag.condition)) return false;
    }

    const [orgValue] = await tx
      .select()
      .from(adminFeatureFlagValue)
      .where(
        and(
          eq(adminFeatureFlagValue.featureKey, featureKey),
          eq(adminFeatureFlagValue.scope, "organization"),
          eq(adminFeatureFlagValue.scopeId, orgId),
        ),
      )
      .limit(1);

    const groupRows = await tx
      .select()
      .from(adminFeatureFlagValue)
      .where(
        and(
          eq(adminFeatureFlagValue.featureKey, featureKey),
          eq(adminFeatureFlagValue.scope, "group"),
          inArray(adminFeatureFlagValue.scopeId, await getOrgGroupIdsTx(tx, orgId)),
        ),
      );

    return resolveEffectiveFlag({
      orgOverride: orgValue?.enabled ?? null,
      groupOverride: resolveGroupValue(groupRows),
      enabledGlobal: flag.enabledGlobal,
    });
  });
}

/** Group ids an organization belongs to (dimension for flags/limits/coupons). */
export async function getOrgGroups(orgId: string): Promise<string[]> {
  return withSystemBypass("flags: getOrgGroups", async (tx) => getOrgGroupIdsTx(tx, orgId));
}

/**
 * The /admin/feature-flags matrix. Optional `orgId` fills the Org column and
 * the condition column (a tenant-scoped usage metric); without it those columns
 * are null.
 */
export async function getEffectiveFlagMatrix(orgId?: string): Promise<FeatureFlagMatrixRow[]> {
  return withSystemBypass("flags: getEffectiveFlagMatrix", async (tx) => {
    const flags = await tx.select().from(adminFeatureFlag).orderBy(adminFeatureFlag.key);

    const rows: FeatureFlagMatrixRow[] = [];

    for (const flag of flags) {
      const groupOverrides = await tx
        .select()
        .from(adminFeatureFlagValue)
        .where(
          and(
            eq(adminFeatureFlagValue.featureKey, flag.key),
            eq(adminFeatureFlagValue.scope, "group"),
          ),
        );

      const groupCells: MatrixGroupCell[] = [];
      for (const g of groupOverrides) {
        groupCells.push({
          groupId: g.scopeId,
          groupName: g.scopeId,
          enabled: g.enabled,
        });
      }

      let orgOverride: boolean | null = null;
      let conditionMatched = true;
      if (orgId) {
        const [ov] = await tx
          .select()
          .from(adminFeatureFlagValue)
          .where(
            and(
              eq(adminFeatureFlagValue.featureKey, flag.key),
              eq(adminFeatureFlagValue.scope, "organization"),
              eq(adminFeatureFlagValue.scopeId, orgId),
            ),
          )
          .limit(1);
        orgOverride = ov?.enabled ?? null;

        if (flag.condition && orgOverride === null) {
          const usage = await countMetric(tx, orgId, flag.condition.metric);
          conditionMatched = conditionSatisfied(usage, flag.condition);
        } else {
          conditionMatched = true;
        }
      }

      rows.push({
        flag,
        enabledGlobal: flag.enabledGlobal,
        groupOverrides: groupCells,
        orgOverride,
        conditionMatched,
      });
    }

    return rows;
  });
}

/**
 * Resolve whether a flag's condition currently holds for an org. Runs the usage
 * count inside the bypass transaction (see header note). Metrics outside the
 * supported set resolve to 0 → fail-closed `false` under a `gte` condition.
 */
export async function conditionMet(
  orgId: string,
  featureKey: string,
): Promise<boolean> {
  return withSystemBypass("flags: conditionMet", async (tx) => {
    const [flag] = await tx
      .select()
      .from(adminFeatureFlag)
      .where(eq(adminFeatureFlag.key, featureKey))
      .limit(1);
    if (!flag?.condition) return false;
    const usage = await countMetric(tx, orgId, flag.condition.metric);
    return conditionSatisfied(usage, flag.condition);
  });
}

async function getOrgGroupIdsTx(tx: TenantDb, orgId: string): Promise<string[]> {
  const rows = await tx
    .select({ groupId: adminClientGroupMember.groupId })
    .from(adminClientGroupMember)
    .where(eq(adminClientGroupMember.organizationId, orgId));
  return rows.map((r) => r.groupId);
}

/**
 * Count a resource metric for one org, INSIDE the bypass tx so the tenant-RLS
 * GUC (`app.bypass_rls`) governs it. Mirrors the query shapes in
 * `features/billing/limits.ts` `getResourceUsage`. `members` is an alias for
 * `max_students`; unsupported metrics count 0 (fail-closed).
 */
async function countMetric(tx: TenantDb, orgId: string, metric: string): Promise<number> {
  switch (metric) {
    case "members":
    case "max_students": {
      const { athlete, client } = await import("@/lib/db/schema");
      const result = await tx
        .select({ count: countDistinct(athlete.id) })
        .from(athlete)
        .innerJoin(client, eq(athlete.parentClientId, client.id))
        .where(
          and(
            eq(client.organizationId, orgId),
            isNull(athlete.deletedAt),
            isNull(client.deletedAt),
          ),
        );
      return result[0]?.count ?? 0;
    }
    case "max_groups": {
      const { groupType } = await import("@/lib/db/schema");
      const result = await tx
        .select({ count: count() })
        .from(groupType)
        .where(and(eq(groupType.organizationId, orgId), isNull(groupType.deletedAt)));
      return result[0]?.count ?? 0;
    }
    case "max_trainers": {
      const { membership } = await import("@/lib/db/schema");
      const result = await tx
        .select({ count: count() })
        .from(membership)
        .where(
          and(
            eq(membership.organizationId, orgId),
            eq(membership.role, "trainer"),
            eq(membership.status, "active"),
          ),
        );
      return result[0]?.count ?? 0;
    }
    case "max_locations": {
      const { location } = await import("@/lib/db/schema");
      const result = await tx
        .select({ count: count() })
        .from(location)
        .where(and(eq(location.organizationId, orgId), isNull(location.deletedAt)));
      return result[0]?.count ?? 0;
    }
    case "max_sessions_per_month": {
      const { classSession } = await import("@/lib/db/schema");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const result = await tx
        .select({ count: count() })
        .from(classSession)
        .where(
          and(
            eq(classSession.organizationId, orgId),
            gte(classSession.startTime, startOfMonth),
          ),
        );
      return result[0]?.count ?? 0;
    }
    default:
      return 0;
  }
}