import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";
import { db } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { requireOrgAccess } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { listUpcomingSessions } from "@/features/schedule/data";
import { listClients } from "@/features/clients/data";
import { listTrainers } from "@/features/trainers/data";
import { listGroupTypes } from "@/features/groups/data";
import {
  athlete,
  auditLog,
  booking,
  client,
  groupType,
  membership,
  user,
} from "@/lib/db/schema";
import { LeaveOrgButton } from "@/features/organizations/components/org-settings";
import TrainerDashboard from "./trainer-dashboard";

export default async function AcademyHome() {
  const { org, role, effectivePermissions } = await requireOrgAccess();

  if (role === "trainer") {
    return <TrainerDashboard />;
  }
  const [t, tr, locale] = await Promise.all([
    getTranslations("dashboard.org"),
    getTranslations("organizations.roles"),
    getLocale(),
  ]);

  const { upcomingSessions, stats, recentActivity } = await withTenant(
    org.id,
    async (tx) => {
      const [upcomingSessions, allClients, allTrainers, allGroupTypes] =
        await Promise.all([
          listUpcomingSessions(tx, org.id, { limit: 5 }),
          listClients(tx, org.id),
          listTrainers(tx, org.id),
          listGroupTypes(tx, org.id),
        ]);

      return {
        upcomingSessions,
        stats: {
          clients: allClients.length,
          trainers: allTrainers.length,
          groupTypes: allGroupTypes.length,
        },
        recentActivity: [] as Array<{
          id: string
          action: string
          actorEmail: string
          targetLabel: string
          createdAt: Date
        }>,
      };
    },
  );

  const recentAudit = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorEmail: auditLog.actorEmail,
      targetLabel: auditLog.targetLabel,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.organizationId, org.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {t("yourRole")} <Badge variant="outline">{tr(role)}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("cards.upcoming")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("cards.noUpcoming")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingSessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{s.groupTypeName}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(s.startTime))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {effectivePermissions.has("sessions.manage") && (
              <Link
                href="/dashboard/schedule"
                className="mt-2 block text-xs font-medium text-primary"
              >
                {t("cards.viewSchedule")}
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("cards.stats")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cards.clients")}</dt>
                <dd className="font-semibold">{stats.clients}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cards.groupTypes")}</dt>
                <dd className="font-semibold">{stats.groupTypes}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cards.trainers")}</dt>
                <dd className="font-semibold">{stats.trainers}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("cards.activity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("cards.noActivity")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <span className="text-muted-foreground">
                      {entry.actorEmail}
                    </span>
                    <span className="ml-1">{entry.action}</span>
                    {entry.targetLabel && (
                      <span className="text-muted-foreground ml-1">
                        → {entry.targetLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {effectivePermissions.has("audit.read") && (
              <Link
                href="/dashboard/settings/audit"
                className="mt-2 block text-xs font-medium text-primary"
              >
                {t("cards.viewAll")}
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("cards.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {t("cards.noPending")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border-border border-t pt-6">
        <LeaveOrgButton />
      </div>
    </div>
  );
}
