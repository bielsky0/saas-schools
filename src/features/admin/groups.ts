import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { withSystemBypass } from "@/lib/db/system";
import type { TenantDb } from "@/lib/db/tenant";
import { adminClientGroup, adminClientGroupMember, organization } from "@/lib/db/schema";

/**
 * Client groups data layer (apex-dashboard-plan Faza 2.3).
 *
 * WHY THIS MODULE USES withSystemBypass (eslint fence exemption): every read
 * here crosses tenants. `admin_client_group` / `admin_client_group_member` are
 * GLOBAL tables whose only RLS policy is the system bypass (migration 0085) —
 * a tenant session must not see another org's group membership, so these reads
 * cannot run under a tenant GUC. The module is enumerated in eslint.config.mjs
 * next to `features/admin/data.ts` for the same reason.
 *
 * All exported functions are reachable only behind `requireSuperAdmin()` —
 * pages call it as their first line, actions pass it directly.
 */

export type AdminGroupRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  createdAt: Date;
};

export type AdminGroupMemberRow = {
  organizationId: string;
  orgName: string;
  orgSlug: string;
  orgStatus: string;
  createdAt: Date;
};

export type AdminGroupableOrg = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

/** All client groups with member counts (apex-dashboard-plan 2.3). */
export async function listGroups(): Promise<AdminGroupRow[]> {
  return withSystemBypass("super admin: client groups list", (tx) =>
    tx
      .select({
        id: adminClientGroup.id,
        name: adminClientGroup.name,
        slug: adminClientGroup.slug,
        description: adminClientGroup.description,
        createdAt: adminClientGroup.createdAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${adminClientGroupMember}
          WHERE ${adminClientGroupMember.groupId} = ${adminClientGroup.id}
        )`,
      })
      .from(adminClientGroup)
      .orderBy(adminClientGroup.name),
  );
}

/** One group, or null (apex-dashboard-plan 2.3). */
export async function getGroup(groupId: string): Promise<AdminGroupRow | null> {
  return withSystemBypass("super admin: client group detail", async (tx) => {
    const rows = await tx
      .select({
        id: adminClientGroup.id,
        name: adminClientGroup.name,
        slug: adminClientGroup.slug,
        description: adminClientGroup.description,
        createdAt: adminClientGroup.createdAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${adminClientGroupMember}
          WHERE ${adminClientGroupMember.groupId} = ${adminClientGroup.id}
        )`,
      })
      .from(adminClientGroup)
      .where(eq(adminClientGroup.id, groupId))
      .limit(1);
    return rows[0] ?? null;
  });
}

/** Organizations currently in a group, newest membership first (2.3). */
export async function listGroupMembers(groupId: string): Promise<AdminGroupMemberRow[]> {
  return withSystemBypass("super admin: group members", (tx) =>
    tx
      .select({
        organizationId: adminClientGroupMember.organizationId,
        orgName: organization.name,
        orgSlug: organization.slug,
        orgStatus: organization.status,
        createdAt: adminClientGroupMember.createdAt,
      })
      .from(adminClientGroupMember)
      .innerJoin(organization, eq(adminClientGroupMember.organizationId, organization.id))
      .where(eq(adminClientGroupMember.groupId, groupId))
      .orderBy(desc(adminClientGroupMember.createdAt)),
  );
}

/** Orgs that COULD join a group (not already members, not soft-deleted). */
export async function listGroupableOrgs(groupId: string): Promise<AdminGroupableOrg[]> {
  return withSystemBypass("super admin: groupable orgs", (tx) =>
    tx
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
      })
      .from(organization)
      .where(and(isNull(organization.deletedAt), orgNotInGroup(tx, groupId)))
      .orderBy(organization.name),
  );
}

/** The client groups an org belongs to — dimension for flags/limits/coupons. */
export async function listOrgGroups(
  orgId: string,
): Promise<{ id: string; name: string; slug: string }[]> {
  return withSystemBypass("super admin: org's client groups", (tx) =>
    tx
      .select({
        id: adminClientGroup.id,
        name: adminClientGroup.name,
        slug: adminClientGroup.slug,
      })
      .from(adminClientGroupMember)
      .innerJoin(adminClientGroup, eq(adminClientGroupMember.groupId, adminClientGroup.id))
      .where(eq(adminClientGroupMember.organizationId, orgId))
      .orderBy(adminClientGroup.name),
  );
}

function orgNotInGroup(tx: TenantDb, groupId: string): SQL {
  return sql`${organization.id} NOT IN (
    SELECT ${adminClientGroupMember.organizationId} FROM ${adminClientGroupMember}
    WHERE ${adminClientGroupMember.groupId} = ${groupId}
  )`;
}