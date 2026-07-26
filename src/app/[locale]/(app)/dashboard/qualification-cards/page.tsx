import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listQualificationCards } from "@/features/qualification-cards/data";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function QualificationCardsPage() {
  const ctx = await requireOrgPermission("qualification_cards.manage");
  const t = await getTranslations("qualificationCards");

  const cards = await withTenant(ctx.org.id, (tx) =>
    listQualificationCards(tx, ctx.org.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("page.title")}</h1>

      {cards.length === 0 ? (
        <p className="text-muted-foreground">No qualification cards have been filled yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2 font-medium">Athlete</th>
                <th className="p-2 font-medium">Camp</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b">
                  <td className="p-2">{card.athleteId}</td>
                  <td className="p-2">{card.groupTypeId}</td>
                  <td className="p-2">
                    <span className={card.status === "leader_completed" ? "text-green-600" : card.status === "parent_completed" ? "text-blue-600" : "text-amber-600"}>
                      {t(`status.${card.status}`)}
                    </span>
                  </td>
                  <td className="p-2">
                    {card.createdAt.toLocaleDateString()}
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
