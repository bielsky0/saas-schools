import { and, asc, count, countDistinct, desc, eq, isNull, sql } from "drizzle-orm";

import { getEffectiveLimit, LIMIT_KEYS, LIMIT_LABELS } from "@/features/billing/limits";
import type { LimitKey } from "@/features/billing/limits";
import { getOrgGroupLimitValues } from "@/features/admin/limits";
import { db } from "@/lib/db";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import {
  adminClientSettingOverride,
  client,
  invitation,
  membership,
  organization,
  organizationLimitOverride,
  page,
  plan,
  planLimitDefinition,
  user,
} from "@/lib/db/schema";

/**
 * Org-console read model (apex-dashboard-plan Faza 4).
 *
 * The console pages render in the cross-tenant `(admin)` shell, so tenant-scoped
 * tables are read through `withTenant(orgId)` (RLS scoping) or
 * `withSystemBypass` where the row is global by design
 * (`admin_client_setting_override`). `organization` itself is outside RLS and
 * read via plain `db`, matching the rest of the Super Admin panel.
 */

/** Re-exported from billing/limits — the canonical home of the key list. */
export { LIMIT_KEYS, LIMIT_LABELS };

/** Minimal org row for the console header. */
export async function getConsoleOrg(orgId: string) {
  const [row] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug, status: organization.status })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  return row ?? null;
}

export type OrgSettingsRow = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  timezone: string;
  currency: string;
  scheduleStartHour: number;
  scheduleEndHour: number;
  scheduleSlotMinutes: number;
  planId: string | null;
  planName: string | null;
  overrides: Omit<typeof adminClientSettingOverride.$inferSelect, "organizationId">[];
  plans: { id: string; name: string }[];
};

export async function getOrgSettingsData(orgId: string): Promise<OrgSettingsRow | null> {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      subdomain: organization.subdomain,
      timezone: organization.timezone,
      currency: organization.currency,
      scheduleStartHour: organization.scheduleStartHour,
      scheduleEndHour: organization.scheduleEndHour,
      scheduleSlotMinutes: organization.scheduleSlotMinutes,
      planId: organization.planId,
      planName: plan.name,
    })
    .from(organization)
    .leftJoin(plan, eq(organization.planId, plan.id))
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!row) return null;

  const [overrides, plans] = await Promise.all([
    withSystemBypass("super admin: org-console settings overrides", (tx) =>
      tx
        .select()
        .from(adminClientSettingOverride)
        .where(eq(adminClientSettingOverride.organizationId, orgId)),
    ),
    db
      .select({ id: plan.id, name: plan.name })
      .from(plan)
      .orderBy(asc(plan.name)),
  ]);

  return {
    ...row,
    overrides: overrides.map((o) => ({ id: o.id, settingKey: o.settingKey, valueJson: o.valueJson, defaultValueJson: o.defaultValueJson, createdAt: o.createdAt })),
    plans,
  };
}

export type OrgTeamRow = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
};

export async function getOrgTeamsData(orgId: string) {
  const [members, invitations] = await Promise.all([
    withSystemBypass("super admin: org-console team members", (tx) =>
      tx
        .select({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          status: membership.status,
        })
        .from(membership)
        .innerJoin(user, eq(membership.userId, user.id))
        .where(eq(membership.organizationId, orgId))
        .orderBy(desc(membership.createdAt)),
    ),
    withTenant(orgId, (tx) =>
      tx
        .select()
        .from(invitation)
        .where(eq(invitation.organizationId, orgId))
        .orderBy(desc(invitation.createdAt)),
    ),
  ]);

  return { members, invitations };
}

export async function getOrgGroupsData(orgId: string) {
  const { listGroupTypes } = await import("@/features/groups/data");
  return withTenant(orgId, (tx) => listGroupTypes(tx, orgId));
}

export type LimitDiffRow = {
  key: LimitKey;
  label: string;
  effective: number | null;
  usage: number;
  planValue: number | null;
  overrideValue: number | null;
  /** Group tier value for the org. `null` + hasGroupOverride = explicit unlimited. */
  groupOverrideValue: number | null;
  hasGroupOverride: boolean;
  source: "override" | "group" | "plan" | "none";
};

/**
 * Limits diff for the org-console limits tab: for every known key, the resolved
 * effective limit (`getEffectiveLimit` — override → group → plan → fail-closed),
 * the plan default, the group-tier value, and the live usage. Usage is counted
 * inside a tenant-scoped transaction handle because `getResourceUsage` uses the
 * plain pooled `db`, which sees no tenant rows from the cross-tenant admin shell.
 */
export async function getOrgLimitsData(orgId: string): Promise<LimitDiffRow[]> {
  const orgRow = await db
    .select({ planId: organization.planId })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const planId = orgRow[0]?.planId;

  const [planValues, overrides, groupValues, effectiveRows] = await Promise.all([
    planId
      ? db
          .select({ limitKey: planLimitDefinition.limitKey, limitValue: planLimitDefinition.limitValue })
          .from(planLimitDefinition)
          .where(eq(planLimitDefinition.planId, planId))
      : [],
    withTenant(orgId, (tx) =>
      tx
        .select()
        .from(organizationLimitOverride)
        .where(eq(organizationLimitOverride.organizationId, orgId)),
    ),
    getOrgGroupLimitValues(orgId),
    Promise.all(
      LIMIT_KEYS.map(async (key) => {
        const effective = await getEffectiveLimit(orgId, key);
        const usage = await withTenant(orgId, (tx) => countResourceUsage(tx, orgId, key));
        return { key, effective, usage };
      }),
    ),
  ]);

  const planByKey = new Map(planValues.map((p) => [p.limitKey, p.limitValue]));
  const overrideByKey = new Map(overrides.map((o) => [o.limitKey, o.limitValue]));

  return LIMIT_KEYS.map((key) => {
    const row = effectiveRows.find((r) => r.key === key) ?? { key, effective: null, usage: 0 };
    const overrideValue = overrideByKey.get(key) ?? null;
    const group = groupValues[key]; // undefined = no override, null = unlimited, number = cap
    const hasGroupOverride = group !== undefined;
    const groupOverrideValue = group ?? null;
    const planValue = planByKey.get(key) ?? null;
    const source: LimitDiffRow["source"] =
      overrideValue !== null ? "override" : hasGroupOverride ? "group" : planValue !== null ? "plan" : "none";
    return {
      key,
      label: LIMIT_LABELS[key],
      effective: row.effective,
      usage: row.usage,
      planValue: planValue === null ? null : planValue,
      overrideValue: overrideValue === null ? null : overrideValue,
      groupOverrideValue,
      hasGroupOverride,
      source,
    };
  });
}

/** Live usage counter — mirrors `billing/limits.getResourceUsage` but accepts a
 *  tenant handle so the cross-tenant admin shell (no RLS GUC) still sees rows. */
async function countResourceUsage(tx: TenantDb, organizationId: string, limitKey: LimitKey) {
  switch (limitKey) {
    case "max_students": {
      const { athlete, client } = await import("@/lib/db/schema");
      const result = await tx
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
      const result = await tx
        .select({ count: count() })
        .from(groupType)
        .where(and(eq(groupType.organizationId, organizationId), isNull(groupType.deletedAt)));
      return result[0]?.count ?? 0;
    }
    case "max_trainers": {
      const result = await tx
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
      const result = await tx
        .select({ count: count() })
        .from(location)
        .where(and(eq(location.organizationId, organizationId), isNull(location.deletedAt)));
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
          and(eq(classSession.organizationId, organizationId), sql`${classSession.startTime} >= ${startOfMonth}`),
        );
      return result[0]?.count ?? 0;
    }
    default: {
      const exhaustive: never = limitKey;
      return exhaustive;
    }
  }
}

export type OrgPageRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  isHome: boolean;
  updatedAt: Date;
};

export async function getOrgPagesData(orgId: string): Promise<OrgPageRow[]> {
  return withTenant(orgId, (tx) =>
    tx
      .select({
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status,
        isHome: page.isHome,
        updatedAt: page.updatedAt,
      })
      .from(page)
      .where(eq(page.organizationId, orgId))
      .orderBy(desc(page.updatedAt)),
  );
}

export async function getOrgCreditsData(
  orgId: string,
): Promise<{ creditTypes: { id: string; name: string }[]; clients: { id: string; email: string; name: string | null }[] }> {
  const { listCreditTypes } = await import("@/features/credits/data");
  return withTenant(orgId, async (tx) => {
    const [creditTypes, clients] = await Promise.all([
      listCreditTypes(tx, orgId),
      tx
        .select({ id: client.id, email: client.email, name: client.name })
        .from(client),
    ]);
    return {
      creditTypes: creditTypes.map((c) => ({ id: c.id, name: c.name })),
      clients: clients.map((c) => ({ id: c.id, email: c.email, name: c.name ?? null })),
    };
  });
}