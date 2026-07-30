import { and, count, eq, gte } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { requireOrgAccess } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { listUpcomingSessions } from "@/features/schedule/data";
import { booking, classSession } from "@/lib/db/schema";

export default async function TrainerDashboard() {
  const { session, org } = await requireOrgAccess();
  const [t, locale] = await Promise.all([
    getTranslations("trainer.dashboard"),
    getLocale(),
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { todaySessions, upcomingSessions } = await withTenant(
    org.id,
    async (tx) => {
      const todaySessions = await listUpcomingSessions(tx, org.id, {
        from: todayStart,
        trainerId: session.user.id,
        limit: 20,
      });

      const upcomingSessions = await listUpcomingSessions(tx, org.id, {
        from: todayEnd,
        trainerId: session.user.id,
        limit: 20,
      });

      return { todaySessions, upcomingSessions };
    },
  );

  const counts = await withTenant(org.id, (tx) =>
    Promise.all(
      [...todaySessions, ...upcomingSessions].map(async (s) => {
        const [row] = await tx
          .select({ count: count() })
          .from(booking)
          .where(
            and(
              eq(booking.organizationId, org.id),
              eq(booking.sessionId, s.id),
              eq(booking.paymentStatus, "confirmed"),
            ),
          );
        return { sessionId: s.id, count: Number(row!.count) };
      }),
    ),
  );
  const countMap = new Map(counts.map((c) => [c.sessionId, c.count]));

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("greeting", { name: session.user.name ?? session.user.email })}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("todayTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClassesToday")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {todaySessions.map((s) => (
                <li
                  key={s.id}
                  className="border-border flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">
                      {formatTime(new Date(s.startTime))} — {s.groupTypeName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {s.locationName ?? "—"} · {countMap.get(s.id) ?? 0}/{s.capacity}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/sessions/${s.id}`}>{t("roster")}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("upcomingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noUpcoming")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pb-2 font-medium">{t("roster")}</th>
                    <th className="pb-2 font-medium">{t("group")}</th>
                    <th className="pb-2 font-medium">{t("participants")}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSessions.map((s) => (
                    <tr key={s.id} className="border-border border-b last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/sessions/${s.id}`}
                          className="text-primary text-xs font-medium"
                        >
                          {formatDate(new Date(s.startTime))} {formatTime(new Date(s.startTime))}
                        </Link>
                      </td>
                      <td className="py-2 text-xs">{s.groupTypeName}</td>
                      <td className="py-2 text-xs">
                        {countMap.get(s.id) ?? 0}/{s.capacity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/trainers/earnings">{t("myEarnings")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/my-classes">{t("myClasses")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/group-change-requests">{t("groupChanges")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
