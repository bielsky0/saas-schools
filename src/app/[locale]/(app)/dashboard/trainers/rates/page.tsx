import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { listRates } from "@/features/trainers/rate-data";
import { RatesPageClient } from "@/features/trainers/components/rates-page-client";
import { listGroupTypes } from "@/features/groups/data";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const ctx = await requireOrgPermission("trainer_rates.manage");
  const t = await getTranslations("dashboard.trainers");

  const { rates, trainers, groupTypes } = await withTenant(ctx.org.id, async (tx) => ({
    rates: await listRates(tx, ctx.org.id),
    trainers: await listTrainers(tx, ctx.org.id),
    groupTypes: await listGroupTypes(tx, ctx.org.id),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("ratesTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("ratesSubtitle")}</p>
      </div>

      <RatesPageClient
        rates={rates}
        trainers={trainers.map((tr) => ({ id: tr.userId, name: tr.name }))}
        groupTypes={groupTypes.map((gt) => ({ id: gt.id, name: gt.name }))}
      />
    </div>
  );
}
