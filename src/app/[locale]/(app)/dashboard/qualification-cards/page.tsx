import { and, eq, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { athlete, groupType, qualificationCard } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { withLocale } from "@/lib/i18n/config";
import { QualificationCardsTabs } from "./qualification-cards-tabs";

const STATUS_TABS = ["all", "parent_pending", "parent_completed", "leader_completed"] as const;

export default async function QualificationCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { org } = await requireOrgPermission("qualification_cards.manage");
  const [t, locale] = await Promise.all([
    getTranslations("qualificationCards"),
    getLocale(),
  ]);

  const { status, q } = await searchParams;
  const activeTab = STATUS_TABS.includes(status as any) ? status as typeof STATUS_TABS[number] : "all";

  const { cards } = await withTenant(org.id, async (tx) => {
    const conditions = [
      eq(qualificationCard.organizationId, org.id),
    ];
    if (activeTab !== "all") {
      conditions.push(eq(qualificationCard.status, activeTab));
    }

    const cards = await tx
      .select({
        id: qualificationCard.id,
        status: qualificationCard.status,
        createdAt: qualificationCard.createdAt,
        athleteName: athlete.name,
        groupTypeName: groupType.name,
      })
      .from(qualificationCard)
      .innerJoin(
        athlete,
        and(eq(athlete.id, qualificationCard.athleteId), eq(athlete.organizationId, org.id)),
      )
      .innerJoin(
        groupType,
        and(eq(groupType.id, qualificationCard.groupTypeId), eq(groupType.organizationId, org.id)),
      )
      .where(and(...conditions))
      .orderBy(qualificationCard.createdAt);

    return { cards };
  });

  const basePath = withLocale("/dashboard/qualification-cards", locale);

  const filteredCards = q
    ? cards.filter((c) => c.athleteName.toLowerCase().includes(q.toLowerCase()))
    : cards;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("page.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("page.subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <QualificationCardsTabs
          defaultValue={activeTab}
          labels={{
            all: t("filterAll"),
            parent_pending: t("status.parent_pending"),
            parent_completed: t("status.parent_completed"),
            leader_completed: t("status.leader_completed"),
          }}
        />
        <form method="GET" action={basePath} className="flex items-center gap-2">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("search")}
            aria-label={t("searchLabel")}
            className="max-w-xs"
          />
          <button type="submit" className="hidden" />
        </form>
      </div>

      {filteredCards.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {q ? t("emptySearch") : t("page.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.athlete")}</TableHead>
              <TableHead>{t("table.camp")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{card.athleteName}</TableCell>
                <TableCell className="text-muted-foreground">{card.groupTypeName}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      card.status === "leader_completed"
                        ? "success"
                        : card.status === "parent_completed"
                          ? "outline"
                          : "warning"
                    }
                  >
                    {t(`status.${card.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {card.createdAt.toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
