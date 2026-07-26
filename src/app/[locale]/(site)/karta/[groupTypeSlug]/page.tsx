import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { resolveClientSession } from "@/features/client-auth/session";
import { listAthletes } from "@/features/clients/data";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { QualificationCardForm } from "@/features/qualification-cards/components/qualification-card-form";
import { getQualificationCard } from "@/features/qualification-cards/data";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function QualificationCardPage({
  params,
}: {
  params: Promise<{ groupTypeSlug: string }>;
}) {
  const org = await requireServedOrganization();
  const { groupTypeSlug } = await params;
  const t = await getTranslations("qualificationCards");

  const groupType = await withTenant(org.id, (tx) =>
    getGroupTypeBySlug(tx, org.id, groupTypeSlug),
  );
  if (!groupType) notFound();
  if (!groupType.requiresQualificationCard) notFound();

  const principal = await resolveClientSession(org.id);
  if (!principal?.isVerified) {
    // Parent not logged in — they need to go through the enrollment flow first.
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">{t("page.title")}</h1>
        <p className="text-muted-foreground mt-4">{t("page.loginRequired")}</p>
      </main>
    );
  }

  // Get the parent's athletes and their card statuses
  const athletes = await withTenant(org.id, async (tx) =>
    listAthletes(tx, org.id, principal.clientId),
  );

  // Fetch existing cards for each athlete
  const cards = await withTenant(org.id, async (tx) =>
    Promise.all(
      athletes.map(async (a) => {
        const card = await getQualificationCard(tx, org.id, groupType.id, a.id);
        return { athlete: a, card };
      }),
    ),
  );

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">{t("page.title")}</h1>
      <p className="text-muted-foreground mt-2">
        {t("page.subtitle", { offerName: groupType.name })}
      </p>

      <div className="mt-8 space-y-8">
        {cards.map(({ athlete, card }) => (
          <section key={athlete.id} className="rounded border p-6">
            <h2 className="text-lg font-medium">
              {athlete.name}
              {card && card.status !== "parent_pending" ? (
                <span className="ml-2 text-sm text-green-600">({t("status.parent_completed")})</span>
              ) : (
                <span className="ml-2 text-sm text-amber-600">({t("status.parent_pending")})</span>
              )}
            </h2>
            <div className="mt-4">
              <QualificationCardForm
                athleteId={athlete.id}
                groupTypeId={groupType.id}
                defaults={card ? {
                  chronicConditions: card.chronicConditions,
                  medications: card.medications,
                  allergies: card.allergies,
                  dietaryRestrictions: card.dietaryRestrictions,
                  vaccinationsInfo: card.vaccinationsInfo,
                  parentContactDuringCamp: card.parentContactDuringCamp,
                } : null}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
