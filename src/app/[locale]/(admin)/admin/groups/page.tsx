import { requireSuperAdmin } from "@/features/admin/context";
import { listGroups } from "@/features/admin/groups";
import { GroupsClient } from "./groups-client";

/**
 * Client groups (apex-dashboard-plan Faza 2.3) — cross-tenant grouping of
 * organizations, the shared dimension for feature flags, limits and coupons.
 */
export default async function AdminGroupsPage() {
  await requireSuperAdmin("/admin/groups");

  const groups = await listGroups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Client Groups</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cross-tenant groupings used as a targeting dimension for flags, limits and coupons.
        </p>
      </div>

      <GroupsClient initialGroups={groups} />
    </div>
  );
}