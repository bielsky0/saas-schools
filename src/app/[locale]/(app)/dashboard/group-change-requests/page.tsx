import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgAccess } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { listGroupChangeRequestsForTrainer } from "@/features/group-changes/data";

const STATUS_VARIANTS: Record<string, "default" | "outline" | "success" | "warning" | "destructive"> = {
  submitted: "default",
  admin_approved: "success",
  admin_rejected: "destructive",
  awaiting_payment: "warning",
  completed: "success",
  expired: "outline",
  cancelled_by_admin: "destructive",
  cancelled_by_client: "outline",
};

export default async function GroupChangeRequestsPage() {
  const { session, org } = await requireOrgAccess();
  const t = await getTranslations("trainer.groupChanges");

  const requests = await withTenant(org.id, (tx) =>
    listGroupChangeRequestsForTrainer(tx, org.id, session.user.id),
  );

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              {t("noRequests")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-3 pr-4 font-medium">{t("client")}</th>
                <th className="pb-3 pr-4 font-medium">{t("from")}</th>
                <th className="pb-3 pr-4 font-medium">{t("to")}</th>
                <th className="pb-3 pr-4 font-medium">{t("targetDate")}</th>
                <th className="pb-3 pr-4 font-medium">{t("status")}</th>
                <th className="pb-3 font-medium">{t("submittedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-border border-b last:border-0">
                  <td className="py-3 pr-4 text-xs">{req.clientName}</td>
                  <td className="py-3 pr-4 text-xs">{req.sourceGroupName}</td>
                  <td className="py-3 pr-4 text-xs">{req.targetGroupName}</td>
                  <td className="py-3 pr-4 text-xs">{formatDate(new Date(req.targetDate))}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={STATUS_VARIANTS[req.status] ?? "outline"}>
                      {formatStatus(req.status)}
                    </Badge>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {formatDate(new Date(req.submittedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
