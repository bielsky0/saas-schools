import { and, count, countDistinct, eq, gte, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { emitDomainNotification } from "@/features/notifications/emit";
import { withSystemBypass } from "@/lib/db/system";
import { site } from "@/lib/site";
import {
  adminClientGroupLimitValue,
  adminClientGroupMember,
  organizationLimitOverride,
  planFeatureFlag,
  planLimitDefinition,
  plan,
  organization,
} from "@/lib/db/schema";

import { resolveEffectiveLimit } from "./limits-resolution";

/**
 * Limit enforcement helper (F9, EPIK 29).
 *
 * Priority: organization_limit_override → admin_client_group_limit_value →
 * plan_limit_definition → fail-closed (0) (apex-dashboard-plan Faza 5 §5.1).
 * Returns: number (explicit limit) | null (unlimited).
 * Fail-closed means: if no plan_limit_definition row exists for the plan+key, return 0 (block).
 *
 * Live COUNT without FOR UPDATE (spec §7 decisions #10–#12).
 * Acceptable risk: transient over-limit by 1 on concurrent admin actions.
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): the org
 * override read and the group-override read are CROSS-TENANT. The override
 * rows are read inside one bypass transaction, separate from the tenant's
 * runtime transaction — `checkLimit` is invoked with a tenant `tx` handle but
 * deliberately queries through the bare pooled `db` (a different connection),
 * so the bypass GUC cannot leak into the tenant transaction. Reading the
 * overrides via bypass ALSO fixes the latent F0 bug where a tenant session —
 * which never sets `app.organization_id` on the bare connection — saw no org
 * override and silently ran on plan limits only. The module is enumerated in
 * eslint.config.mjs next to `features/admin/data.ts` for the same reason.
 */

/** All known limit keys (matching §2.20 table). */
export type LimitKey =
  | "max_students"
  | "max_groups"
  | "max_trainers"
  | "max_locations"
  | "max_sessions_per_month";

/** Known limit keys in display order (matching §2.20 table). */
export const LIMIT_KEYS: LimitKey[] = [
  "max_students",
  "max_groups",
  "max_trainers",
  "max_locations",
  "max_sessions_per_month",
];

/** Short English labels for the admin matrix / org-console diff. */
export const LIMIT_LABELS: Record<LimitKey, string> = {
  max_students: "Students",
  max_groups: "Groups",
  max_trainers: "Trainers",
  max_locations: "Locations",
  max_sessions_per_month: "Sessions / month",
};

/** Longer hints shown in the admin matrix rows. */
export const LIMIT_DESCRIPTIONS: Record<LimitKey, string> = {
  max_students: "Athletes reachable through client parents.",
  max_groups: "Group types.",
  max_trainers: "Active trainer memberships.",
  max_locations: "Locations.",
  max_sessions_per_month: "Class sessions started this calendar month.",
};

/**
 * Get effective limit for an organization and limit key.
 * Priority: override → group override → plan → fail-closed (0).
 * Returns null = unlimited, 0 = fail-closed (block), positive number = explicit limit.
 */
export async function getEffectiveLimit(
  organizationId: string,
  limitKey: LimitKey,
): Promise<number | null> {
  const [{ orgOverride, groupValues }, planValue] = await Promise.all([
    // 1. Org override + group overrides — GLOBAL/bypass-only tables. Resolved
    // together in ONE bypass transaction (same shape as flags.getOrgGroups).
    withSystemBypass("limits: resolve org + group overrides", async (tx) => {
      const [override] = await tx
        .select({ limitValue: organizationLimitOverride.limitValue })
        .from(organizationLimitOverride)
        .where(
          and(
            eq(organizationLimitOverride.organizationId, organizationId),
            eq(organizationLimitOverride.limitKey, limitKey),
          ),
        )
        .limit(1);

      const groupIds = (
        await tx
          .select({ groupId: adminClientGroupMember.groupId })
          .from(adminClientGroupMember)
          .where(eq(adminClientGroupMember.organizationId, organizationId))
      ).map((r) => r.groupId);

      let groupValues: (number | null)[] = [];
      if (groupIds.length > 0) {
        groupValues = (
          await tx
            .select({ limitValue: adminClientGroupLimitValue.limitValue })
            .from(adminClientGroupLimitValue)
            .where(
              and(
                inArray(adminClientGroupLimitValue.groupId, groupIds),
                eq(adminClientGroupLimitValue.limitKey, limitKey),
              ),
            )
        ).map((r) => r.limitValue);
      }

      return {
        orgOverride: override ? { value: override.limitValue ?? null } : undefined,
        groupValues,
      };
    }),
    // 2. Plan + plan limit definition — `plan*` tables carry a permissive
    // select_all policy, so the plain pool sees them without a tenant GUC.
    (async () => {
      const [org] = await db
        .select({ planId: organization.planId })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      if (!org?.planId) return undefined; // fail-closed: no plan = block

      const [limitDef] = await db
        .select({ limitValue: planLimitDefinition.limitValue })
        .from(planLimitDefinition)
        .where(
          and(
            eq(planLimitDefinition.planId, org.planId),
            eq(planLimitDefinition.limitKey, limitKey),
          ),
        )
        .limit(1);

      // undefined = no definition (block); the nullable value (null =
      // unlimited, number = explicit) flows through untouched.
      return limitDef ? limitDef.limitValue : undefined;
    })(),
  ]);

  return resolveEffectiveLimit({ orgOverride, groupValues, planValue });
}

/**
 * Get current resource usage (live COUNT) for an organization and limit key.
 * Centralized to ensure consistent filtering (deletedAt IS NULL etc.) across all call sites.
 * Matches §2.20 table exactly.
 */
export async function getResourceUsage(organizationId: string, limitKey: LimitKey): Promise<number> {
  switch (limitKey) {
    case "max_students": {
      // COUNT DISTINCT athlete where athlete.parent_client_id → client.organization_id = orgId
      const { athlete, client } = await import("@/lib/db/schema");
      const result = await db
        .select({ count: countDistinct(athlete.id) })
        .from(athlete)
        .innerJoin(client, eq(athlete.parentClientId, client.id))
        .where(
          and(
            eq(client.organizationId, organizationId),
            isNull(athlete.deletedAt),
            isNull(client.deletedAt),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case "max_groups": {
      const { groupType } = await import("@/lib/db/schema");
      const result = await db
        .select({ count: count() })
        .from(groupType)
        .where(
          and(
            eq(groupType.organizationId, organizationId),
            isNull(groupType.deletedAt),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case "max_trainers": {
      const { membership } = await import("@/lib/db/schema");
      const result = await db
        .select({ count: count() })
        .from(membership)
        .where(
          and(
            eq(membership.organizationId, organizationId),
            eq(membership.role, "trainer"),
            eq(membership.status, "active"),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case "max_locations": {
      const { location } = await import("@/lib/db/schema");
      const result = await db
        .select({ count: count() })
        .from(location)
        .where(
          and(
            eq(location.organizationId, organizationId),
            isNull(location.deletedAt),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case "max_sessions_per_month": {
      const { classSession } = await import("@/lib/db/schema");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const result = await db
        .select({ count: count() })
        .from(classSession)
        .where(
          and(
            eq(classSession.organizationId, organizationId),
            gte(classSession.startTime, startOfMonth),
          ),
        );
      return result[0]?.count ?? 0;
    }

    default:
      // Exhaustiveness check — TypeScript will error if a new LimitKey is added without handling
      const _exhaustive: never = limitKey;
      return 0;
  }
}

/**
 * Check if operation would exceed limit. Throws user-facing error if so.
 * Called BEFORE creating the resource (spec §2.20).
 * Also enqueues email notifications when thresholds are hit (F9, EPIK 29).
 */
export async function checkLimit(organizationId: string, limitKey: LimitKey): Promise<void> {
  const limit = await getEffectiveLimit(organizationId, limitKey);
  if (limit === null) return; // unlimited

  const usage = await getResourceUsage(organizationId, limitKey);
  if (usage >= limit) {
    const limitLabels: Record<LimitKey, string> = {
      max_students: "uczniów",
      max_groups: "grup",
      max_trainers: "trenerów",
      max_locations: "lokalizacji",
      max_sessions_per_month: "sesji w miesiącu",
    };
    // Enqueue limit reached notification (once per breach)
    await enqueueLimitReachedNotification(organizationId, limitKey, usage, limit);
    throw new Error(
      `Limit planu: ${usage}/${limit} ${limitLabels[limitKey]}. Przejdź na wyższy plan.`,
    );
  }

  // F9: Enqueue email notification when approaching 80% threshold
  const percentage = Math.round((usage / limit) * 100);
  if (percentage >= 80 && percentage < 100) {
    await enqueueApproachingNotification(organizationId, limitKey, usage, limit, percentage);
  }
}

/**
 * Enqueue plan_limit_approaching email when usage hits 80% threshold.
 * Uses a dedupe key to avoid spamming the same threshold.
 */
async function enqueueApproachingNotification(
  organizationId: string,
  limitKey: LimitKey,
  usage: number,
  limit: number,
  percentage: number,
): Promise<void> {
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) return;

  // Bucket by 5% increments to avoid too many emails (80, 85, 90, 95)
  const bucket = Math.floor(percentage / 5) * 5;
  const dedupeKey = `plan_limit_approaching:${organizationId}:${limitKey}:${bucket}`;

  // Check if we already sent this notification for this bucket
  const { isDeduped } = await import("@/lib/adapters/jobs");
  const alreadySent = await isDeduped(dedupeKey);
  if (alreadySent) return;

  // Find admin users in the organization to notify
  const { membership, user } = await import("@/lib/db/schema");
  const admins = await db
    .select({ id: user.id, email: user.email, name: user.name, locale: user.locale })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(
      and(
        eq(membership.organizationId, organizationId),
        eq(membership.status, "active"),
        eq(membership.role, "admin"),
      ),
    );

  const limitLabels: Record<LimitKey, string> = {
    max_students: "uczniowie",
    max_groups: "grupy",
    max_trainers: "trenerzy",
    max_locations: "lokalizacje",
    max_sessions_per_month: "sesje w miesiącu",
  };

  const billingUrl = `${site.url}/dashboard/billing`;

  await emitDomainNotification(db, {
    eventType: "plan_limit_approaching",
    organizationId,
    accountId: null,
    recipients: admins.map(a => ({
      kind: "staff" as const,
      userId: a.id,
      email: a.email,
      name: a.name || undefined,
      locale: a.locale || "pl",
    })),
    params: { orgName: org.name, limitKey, limitLabel: limitLabels[limitKey], usage, limit, percentage, upgradeUrl: billingUrl },
    link: billingUrl,
    dedupeBasis: `plan_limit_approaching:${organizationId}:${limitKey}:${bucket}`,
  });
}

/**
 * Enqueue plan_limit_reached email when limit is hit (100%).
 * Only sends once per breach.
 */
export async function enqueueLimitReachedNotification(
  organizationId: string,
  limitKey: LimitKey,
  usage: number,
  limit: number,
): Promise<void> {
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org) return;

  const dedupeKey = `plan_limit_reached:${organizationId}:${limitKey}`;

  const { isDeduped } = await import("@/lib/adapters/jobs");
  const alreadySent = await isDeduped(dedupeKey);
  if (alreadySent) return;

  const { membership, user } = await import("@/lib/db/schema");
  const admins = await db
    .select({ id: user.id, email: user.email, name: user.name, locale: user.locale })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(
      and(
        eq(membership.organizationId, organizationId),
        eq(membership.status, "active"),
        eq(membership.role, "admin"),
      ),
    );

  const limitLabels: Record<LimitKey, string> = {
    max_students: "uczniowie",
    max_groups: "grupy",
    max_trainers: "trenerzy",
    max_locations: "lokalizacje",
    max_sessions_per_month: "sesje w miesiącu",
  };

  const billingUrl = `${site.url}/dashboard/billing`;

  await emitDomainNotification(db, {
    eventType: "plan_limit_reached",
    organizationId,
    accountId: null,
    recipients: admins.map(a => ({
      kind: "staff" as const,
      userId: a.id,
      email: a.email,
      name: a.name || undefined,
      locale: a.locale || "pl",
    })),
    params: { orgName: org.name, limitKey, limitLabel: limitLabels[limitKey], usage, limit, upgradeUrl: billingUrl },
    link: billingUrl,
    dedupeBasis: `plan_limit_reached:${organizationId}:${limitKey}`,
  });
}

/**
 * Check feature flag for organization.
 * Fail-closed: missing flag = disabled.
 */
export async function hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
  const [org] = await db
    .select({ planId: organization.planId })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org?.planId) return false;

  const [flag] = await db
    .select({ isEnabled: planFeatureFlag.isEnabled })
    .from(planFeatureFlag)
    .where(
      and(
        eq(planFeatureFlag.planId, org.planId),
        eq(planFeatureFlag.featureKey, featureKey),
      ),
    )
    .limit(1);

  return flag?.isEnabled ?? false; // fail-closed
}

/**
 * Get plan details for pricing page / UI (SSR).
 */
export async function getPlanDetails(planCode: string) {
  const [p] = await db
    .select({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      stripePriceId: plan.stripePriceId,
      isCustom: plan.isCustom,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    })
    .from(plan)
    .where(eq(plan.code, planCode))
    .limit(1);

  if (!p) return null;

  const limits = await db
    .select({ limitKey: planLimitDefinition.limitKey, limitValue: planLimitDefinition.limitValue })
    .from(planLimitDefinition)
    .where(eq(planLimitDefinition.planId, p.id));

  const features = await db
    .select({ featureKey: planFeatureFlag.featureKey, isEnabled: planFeatureFlag.isEnabled })
    .from(planFeatureFlag)
    .where(eq(planFeatureFlag.planId, p.id));

  return {
    ...p,
    limits: Object.fromEntries(limits.map((l) => [l.limitKey, l.limitValue])),
    features: Object.fromEntries(features.map((f) => [f.featureKey, f.isEnabled])),
  };
}

/**
 * Get all active plans for pricing page (SSR).
 */
export async function getAllActivePlans(): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    stripePriceId: string | null;
    isCustom: boolean;
    isActive: boolean;
    sortOrder: number;
    amount: number | null;
    currency: string | null;
    interval: string | null;
    featured: boolean;
    limits: Record<string, number | null>;
    features: Record<string, boolean>;
  }>
> {
  const plans = await db
    .select({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      stripePriceId: plan.stripePriceId,
      isCustom: plan.isCustom,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      featured: plan.featured,
    })
    .from(plan)
    .where(eq(plan.isActive, true))
    .orderBy(plan.sortOrder);

  const results = await Promise.all(
    plans.map(async (p) => {
      const limits = await db
        .select({ limitKey: planLimitDefinition.limitKey, limitValue: planLimitDefinition.limitValue })
        .from(planLimitDefinition)
        .where(eq(planLimitDefinition.planId, p.id));

      const features = await db
        .select({ featureKey: planFeatureFlag.featureKey, isEnabled: planFeatureFlag.isEnabled })
        .from(planFeatureFlag)
        .where(eq(planFeatureFlag.planId, p.id));

      return {
        ...p,
        limits: Object.fromEntries(limits.map((l) => [l.limitKey, l.limitValue])),
        features: Object.fromEntries(features.map((f) => [f.featureKey, f.isEnabled])),
      };
    }),
  );

  return results;
}