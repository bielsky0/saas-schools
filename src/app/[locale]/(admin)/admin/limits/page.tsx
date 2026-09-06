import { requireSuperAdmin } from "@/features/admin/context";
import { listGroups } from "@/features/admin/groups";
import { listGroupLimits } from "@/features/admin/limits";
import { getAllOrgOverrides } from "@/features/admin/plans-data";

import { LimitsClient } from "./limits-client";

/**
 * Limits admin (apex-dashboard-plan Faza 5, §5.1). A matrix of the five known
 * limit keys × every client group: each cell is the group's override (a number,
 * explicit "unlimited", or "inherit" when no row exists). The effective limit an
 * org sees is resolved at runtime by `getEffectiveLimit` in priority
 * org-override → group → plan → fail-closed (billing/limits-resolution.ts).
 *
 * All reads are cross-tenant (`admin_client_group` / `admin_client_group_member`
 * / `admin_client_group_limit_value` are bypass-only tables), so they run behind
 * `requireSuperAdmin` and through withSystemBypass data layers.
 */
export default async function AdminLimitsPage() {
  await requireSuperAdmin("/admin/limits");

  const [groups, groupLimits, orgOverrides] = await Promise.all([
    listGroups(),
    listGroupLimits(),
    getAllOrgOverrides(),
  ]);

  return (
    <LimitsClient
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      groupLimits={groupLimits.map((r) => ({
        groupId: r.groupId,
        limitKey: r.limitKey,
        limitValue: r.limitValue,
      }))}
      orgOverrides={orgOverrides.map((o) => ({
        organizationId: o.organizationId,
        limitKey: o.limitKey,
        limitValue: o.limitValue,
      }))}
    />
  );
}