import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/features/admin/context";
import { getGroup, listGroupMembers, listGroupableOrgs } from "@/features/admin/groups";
import { GroupDetailClient } from "./group-detail-client";

/**
 * Client group detail (apex-dashboard-plan Faza 2.3) — members list, add/remove
 * organizations, edit, delete.
 */
export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await requireSuperAdmin("/admin/groups");

  const { groupId } = await params;

  const [group, members, groupableOrgs] = await Promise.all([
    getGroup(groupId),
    listGroupMembers(groupId),
    listGroupableOrgs(groupId),
  ]);

  if (!group) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Group</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organizations using flags, limits and coupons scoped to this group.
        </p>
      </div>

      <GroupDetailClient group={group} members={members} groupableOrgs={groupableOrgs} />
    </div>
  );
}