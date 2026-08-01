import { getTranslations } from "next-intl/server";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { listRates } from "@/features/trainers/rate-data";
import { EarningsReportClient } from "@/features/trainers/components/earnings-report-client";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const ctx = await requireOrgPermission("trainer_earnings.view");
  const t = await getTranslations("dashboard.trainers");

  const effectiveRole = ctx.membership?.role;
  const isTrainer = effectiveRole === "trainer";

  const { trainers, trainersWithoutRate, selfHasRate } = await withTenant(
    ctx.org.id,
    async (tx) => {
      const rates = await listRates(tx, ctx.org.id);
      const withRate = new Set(rates.map((r) => r.trainerId));
      const allTrainers = isTrainer ? [] : await listTrainers(tx, ctx.org.id);
      const missing = allTrainers
        .filter((tr) => !withRate.has(tr.userId))
        .map((tr) => tr.userId);
      return {
        trainers: allTrainers,
        trainersWithoutRate: missing,
        selfHasRate: isTrainer ? withRate.has(ctx.session.user.id) : true,
      };
    },
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("earningsTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("earningsSubtitle")}</p>
      </div>

      {!isTrainer && trainersWithoutRate.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>{t("earningsNoRateAdminTitle")}</AlertTitle>
          <AlertDescription>
            {t("earningsNoRateAdminBody")}{" "}
            <Link href="/dashboard/trainers/rates" className="underline underline-offset-4">
              {t("earningsNoRateAdminLink")}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {isTrainer && !selfHasRate ? (
        <Alert variant="warning">
          <AlertDescription>{t("earningsSelfNoRate")}</AlertDescription>
        </Alert>
      ) : null}

      <EarningsReportClient
        trainers={trainers.map((tr) => ({ id: tr.userId, name: tr.name }))}
        trainersWithoutRate={trainersWithoutRate}
        selfScope={isTrainer}
      />
    </div>
  );
}
