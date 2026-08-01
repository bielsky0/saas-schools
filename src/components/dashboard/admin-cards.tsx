import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { withTenant } from "@/lib/db/tenant";
import { listUpcomingSessions } from "@/features/schedule/data";
import { listClients } from "@/features/clients/data";
import { listTrainers } from "@/features/trainers/data";
import { listGroupTypes } from "@/features/groups/data";
import { countLeaveRequests } from "@/features/trainers/leave-data";
import { countGroupChangeRequests } from "@/features/group-changes/data";
import { listOrgAuditEntries } from "@/features/organizations/audit-data";
import type { Permission } from "@/features/rbac";
import { CardSkeleton } from "./card-skeleton";
import { formatRelativeTime } from "./relative-time";

/**
 * Admin/owner dashboard cards (Faza 07, §7a).
 *
 * Each card is its own async server component so it streams independently inside
 * its own Suspense boundary with a skeleton fallback — one slow query must not
 * hold the rest of the dashboard.
 */

export function AdminDashboardCards({
  orgId,
  permissions,
}: {
  orgId: string;
  permissions: ReadonlySet<Permission>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardSkeleton lines={5} />}>
          <UpcomingSessionsCard orgId={orgId} />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={4} />}>
          <StatsCard orgId={orgId} />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={2} />}>
          <PendingCard orgId={orgId} />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={5} />}>
          <ActivityCard orgId={orgId} />
        </Suspense>
      </div>
      <Suspense fallback={<CardSkeleton lines={2} />}>
        <QuickActionsCard permissions={permissions} />
      </Suspense>
    </div>
  );
}

async function UpcomingSessionsCard({ orgId }: { orgId: string }) {
  const [t, locale] = await Promise.all([getTranslations("dashboard.org"), getLocale()]);
  const now = new Date();

  const { upcoming, today } = await withTenant(orgId, async (tx) => {
    const [upcoming, today] = await Promise.all([
      listUpcomingSessions(tx, orgId, { limit: 5 }),
      listUpcomingSessions(tx, orgId, {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      }),
    ]);
    return { upcoming, today };
  });

  const sessions = upcoming.length >= 5 ? upcoming : today;
  const formatWhen = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{t("cards.upcoming")}</CardTitle>
        <Badge variant="outline">{today.length}</Badge>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("cards.noUpcoming")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{s.groupTypeName}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatWhen.format(new Date(s.startTime))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/schedule"
          className="mt-2 block text-xs font-medium text-primary"
        >
          {t("cards.viewSchedule")}
        </Link>
      </CardContent>
    </Card>
  );
}

async function StatsCard({ orgId }: { orgId: string }) {
  const t = await getTranslations("dashboard.org");
  const now = new Date();

  const stats = await withTenant(orgId, async (tx) => {
    const [clients, trainers, groupTypes, todaySessions] = await Promise.all([
      listClients(tx, orgId),
      listTrainers(tx, orgId),
      listGroupTypes(tx, orgId),
      listUpcomingSessions(tx, orgId, {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      }),
    ]);
    return {
      clients: clients.length,
      trainers: trainers.length,
      groupTypes: groupTypes.length,
      todaySessions: todaySessions.length,
    };
  });

  const rows = [
    { label: t("cards.clients"), value: stats.clients },
    { label: t("cards.groupTypes"), value: stats.groupTypes },
    { label: t("cards.trainers"), value: stats.trainers },
    { label: t("cards.todaySessions"), value: stats.todaySessions },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("cards.stats")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="border-border flex flex-col gap-0.5 rounded-lg border p-2"
            >
              <dt className="text-muted-foreground text-[11px]">{row.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

async function PendingCard({ orgId }: { orgId: string }) {
  const t = await getTranslations("dashboard.org");

  const { leaveRequests, groupChanges } = await withTenant(orgId, async (tx) => {
    const [leaveRequests, groupChanges] = await Promise.all([
      countLeaveRequests(tx, orgId, "submitted"),
      countGroupChangeRequests(tx, orgId, "submitted"),
    ]);
    return { leaveRequests, groupChanges };
  });

  const total = leaveRequests + groupChanges;
  const items = [
    { label: t("cards.pendingLeave"), count: leaveRequests, href: "/dashboard/leave-requests" },
    { label: t("cards.pendingGroupChanges"), count: groupChanges, href: "/dashboard/group-change-requests" },
  ].filter((i) => i.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("cards.pending")}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-xs">{t("cards.allDone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors"
                >
                  <span>{item.label}</span>
                  <Badge variant="warning">{item.count}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function ActivityCard({ orgId }: { orgId: string }) {
  const t = await getTranslations("dashboard.org");

  const page = await listOrgAuditEntries(orgId, { q: "", from: "", to: "", page: 0 });
  const entries = page.rows.slice(0, 5);
  const relativeTimes = await Promise.all(
    entries.map((entry) => formatRelativeTime(entry.createdAt)),
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("cards.activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("cards.noActivity")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">{entry.actorEmail}</span>
                  <span className="ml-1">{entry.action}</span>
                  {entry.targetLabel && (
                    <span className="text-muted-foreground ml-1">→ {entry.targetLabel}</span>
                  )}
                </span>
                <span className="text-muted-foreground/70 shrink-0">
                  {relativeTimes[i]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/settings/audit"
          className="mt-2 block text-xs font-medium text-primary"
        >
          {t("cards.viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

async function QuickActionsCard({ permissions }: { permissions: ReadonlySet<Permission> }) {
  const t = await getTranslations("dashboard.org");

  const actions = [
    {
      label: t("cards.addGroupType"),
      href: "/dashboard/group-types",
      permission: "group_types.manage" as const,
    },
    {
      label: t("cards.addTrainer"),
      href: "/dashboard/trainers",
      permission: "trainer_availability.manage" as const,
    },
    {
      label: t("cards.inviteMember"),
      href: "/dashboard/members",
      permission: "members.invite" as const,
    },
  ].filter((a) => permissions.has(a.permission));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("cards.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.href} asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
