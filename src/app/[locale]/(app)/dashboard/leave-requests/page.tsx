import { getTranslations } from "next-intl/server";

import { requireOrgAccess, requireOrgPermission } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { listLeaveRequests } from "@/features/trainers/leave-data";
import { withTenant } from "@/lib/db/tenant";

import { LeaveRequestList } from "./leave-request-list";

export default async function LeaveRequestsPage() {
  const ctx = await requireOrgAccess();
  const isAdmin = ctx.effectivePermissions.has("sessions.manage");
  const t = await getTranslations("dashboard.leaveRequests");

  const requests = await withTenant(ctx.org.id, async (tx) => {
    if (isAdmin) {
      return listLeaveRequests(tx, ctx.org.id);
    }
    return listLeaveRequests(tx, ctx.org.id, { trainerId: ctx.membership.userId });
  });

  let trainers: { userId: string; name: string | null; email: string }[] = [];
  if (isAdmin) {
    const rows = await withTenant(ctx.org.id, (tx) => listTrainers(tx, ctx.org.id));
    trainers = rows.map((r) => ({ userId: r.userId, name: r.name, email: r.email }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {!isAdmin && (
          <a
            href="/dashboard/leave-requests/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
          >
            {t("newRequest")}
          </a>
        )}
      </div>

      <LeaveRequestList
        requests={requests}
        isAdmin={isAdmin}
        trainers={trainers}
      />
    </div>
  );
}
