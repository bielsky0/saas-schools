import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { getTrainer } from "@/features/trainers/data";
import { listAvailability } from "@/features/trainers/availability-data";
import { withTenant } from "@/lib/db/tenant";
import { AvailabilityPageClient } from "@/features/trainers/components/availability-page-client";

export default async function TrainerAvailabilityPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = await params;
  const ctx = await requireOrgPermission("trainer_availability.manage");
  const t = await getTranslations("dashboard.trainers");

  const trainer = await withTenant(ctx.org.id, (tx) => getTrainer(tx, ctx.org.id, trainerId));
  if (!trainer) notFound();

  const windows = await withTenant(ctx.org.id, (tx) =>
    listAvailability(tx, ctx.org.id, { trainerId }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("availabilityTitle", { name: trainer.name ?? trainer.email })}</h1>
      </div>

      <AvailabilityPageClient
        windows={windows}
        trainerId={trainerId}
      />
    </div>
  );
}
