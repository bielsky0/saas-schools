import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { withTenant } from "@/lib/db/tenant";
import { listUpcomingSessions } from "@/features/schedule/data";
import type { Permission } from "@/features/rbac";
import { CardSkeleton } from "./card-skeleton";

/**
 * Reception / secretariat dashboard cards (Faza 07, §7a).
 *
 * These roles run the front desk: they confirm cash payments, sell packages and
 * mark invoices — and need today's class list without a trainer filter. Each
 * card streams inside its own Suspense boundary.
 */
export function ReceptionCards({
  orgId,
  permissions,
}: {
  orgId: string;
  permissions: ReadonlySet<Permission>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<CardSkeleton lines={4} />}>
        <TodaySessionsCard orgId={orgId} />
      </Suspense>
      <Suspense fallback={<CardSkeleton lines={2} />}>
        <ReceptionQuickActionsCard permissions={permissions} />
      </Suspense>
    </div>
  );
}

async function TodaySessionsCard({ orgId }: { orgId: string }) {
  const [t, locale] = await Promise.all([getTranslations("dashboard.org.reception"), getLocale()]);
  const now = new Date();

  const sessions = await withTenant(orgId, (tx) =>
    listUpcomingSessions(tx, orgId, {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    }),
  );

  const formatWhen = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("todayTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("noClassesToday")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md px-2 py-1 text-xs"
              >
                <span className="truncate">
                  {formatWhen.format(new Date(s.startTime))} — {s.groupTypeName}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {s.trainerName || s.trainerEmail || t("noTrainer")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function ReceptionQuickActionsCard({ permissions }: { permissions: ReadonlySet<Permission> }) {
  const t = await getTranslations("dashboard.org.reception");

  const actions = [
    {
      label: t("confirmCash"),
      href: "/dashboard/purchases",
      permission: "credits.confirm_on_site" as const,
    },
    {
      label: t("sellPackage"),
      href: "/dashboard/purchases",
      permission: "credits.purchase_cash" as const,
    },
    {
      label: t("clients"),
      href: "/dashboard/clients",
      permission: "members.invite" as const,
    },
    {
      label: t("extraFees"),
      href: "/dashboard/extra-fees",
      permission: "extra_fees.manage" as const,
    },
  ].filter((a) => permissions.has(a.permission));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("quickActions")}</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("noActions")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button key={action.href + action.label} asChild variant="outline" size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
