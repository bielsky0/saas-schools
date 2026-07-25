import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { EarningsReportClient } from "@/features/trainers/components/earnings-report-client";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const ctx = await requireOrgPermission("trainer_earnings.view");
  const t = await getTranslations("dashboard.trainers");

  const effectiveRole = ctx.membership?.role;
  const isTrainer = effectiveRole === "trainer";

  const trainers = isTrainer
    ? []
    : await withTenant(ctx.org.id, (tx) => listTrainers(tx, ctx.org.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("earningsTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("earningsSubtitle")}</p>
      </div>

      <EarningsReportClient
        trainers={trainers.map((tr) => ({ id: tr.userId, name: tr.name }))}
        selfScope={isTrainer}
      />
    </div>
  );
}
