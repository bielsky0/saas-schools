import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, eq, isNull } from "drizzle-orm";

import { buildMonthGrid, defaultMonth } from "@/features/bookings/calendar";
import { listSessionAvailability, listSlotFirstAvailability } from "@/features/bookings/data";
import { paymentOptionsFor, type PackageTeaser } from "@/features/bookings/payment-options";
import { EnrollmentFlow } from "@/features/bookings/components/enrollment-flow";
import { SlotFirstFlow } from "@/features/bookings/components/slot-first-flow";
import { resolveClientSession } from "@/features/client-auth/session";
import { listAthletes } from "@/features/clients/data";
import { getActiveConsentsForSignup } from "@/features/consents/data";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { getActivePolicyForGroupType, getLatestAcceptanceForClientGroupType } from "@/features/policies/data";
import { resolveClientPrice } from "@/features/pricing/resolve";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { listTrainers } from "@/features/trainers/data";
import { InterestSignupForm } from "@/features/interest-signups/components/interest-signup-form";
import { creditType, productTemplate } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { monthRangeInZone, shiftMonth } from "@/lib/datetime";

/**
 * Public enrollment for one offer (langlion EPIK 4, §2.27).
 *
 * ⚠️ `requireServedOrganization()` IS THE FIRST STATEMENT, before params, before
 * any query. On the apex the proxy forwards `/zapisy/*` here via an early return
 * that skips default-deny (see reserved-slugs.ts / proxy.ts): this call is the
 * ONLY thing that makes that safe, `notFound()`ing for the apex, a foreign host
 * or an unknown academy alike. Moving it down would serve one academy's form on
 * the platform domain. Pinned by e2e/langlion-subdomain-routing.spec.ts.
 */
export const dynamic = "force-dynamic";

/**
 * `noindex`, and NO canonical. `pageMetadata()` builds a canonical against the
 * APEX origin (`absoluteUrl`), which on a tenant host points at a URL that 404s
 * (§2.27) — so this page sets robots directly rather than borrowing that helper.
 * A per-tenant canonical belongs to the CMS module's own metadata, which resolves
 * a host; an enrollment funnel is not a search landing page anyway.
 */
export function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function EnrollmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupTypeSlug: string }>;
  searchParams: Promise<{ m?: string; trainerId?: string }>;
}) {
  const org = await requireServedOrganization();
  const { groupTypeSlug } = await params;
  const { m, trainerId } = await searchParams;

  const t = await getTranslations("enrollment");

  const { groupType, packages } = await withTenant(org.id, async (tx) => {
    const gt = await getGroupTypeBySlug(tx, org.id, groupTypeSlug);
    let pkgs: PackageTeaser[] = [];

    if (gt) {
      const [ct] = await tx
        .select({ id: creditType.id })
        .from(creditType)
        .where(
          and(
            eq(creditType.groupTypeId, gt.id),
            eq(creditType.organizationId, org.id),
            isNull(creditType.deletedAt),
          ),
        )
        .limit(1);

      if (ct) {
        pkgs = await tx
          .select({
            id: productTemplate.id,
            name: productTemplate.name,
            price: productTemplate.price,
            creditQuantity: productTemplate.creditQuantity,
            billingType: productTemplate.billingType,
          })
          .from(productTemplate)
          .where(
            and(
              eq(productTemplate.creditTypeId, ct.id),
              eq(productTemplate.organizationId, org.id),
              eq(productTemplate.isActive, true),
            ),
          );
      }
    }

    return { groupType: gt ?? null, packages: pkgs } as const;
  });
  if (!groupType) notFound();

  const principal = await resolveClientSession(org.id);
  const recognized = principal?.isVerified ? principal : null;

  // Faza 21: resolve individual client price if recognized and verified.
  const discountedPrice = recognized
    ? await withTenant(org.id, (tx) =>
        resolveClientPrice(tx, recognized.clientId, groupType.id, groupType.price),
      )
    : null;

  const paymentView = paymentOptionsFor(
    {
      paymentPolicy: groupType.paymentPolicy,
      allowedPurchaseModes: groupType.allowedPurchaseModes,
      allowedBillingTypes: groupType.allowedBillingTypes,
    },
    {
      onlineAvailable: org.stripeConnectChargesEnabled ?? false,
      packages,
    },
  );

  // Faza 19: log a warning when a package-only group type has no active templates
  // (configuration error — the group type is "dead", parent sees no_packages_available).
  if (paymentView.kind === "no_packages_available" && groupType.allowedPurchaseModes.includes("package")) {
    const logger = await import("@/lib/logger").then((m) => m.createLogger("enrollment"));
    logger.warn("package-only group type has no active product templates", {
      groupTypeId: groupType.id,
      groupTypeSlug,
    });
  }

  // The month the calendar shows. Package-only / none-available offers render no
  // calendar (see the flow), so the query only runs when there is something to book.
  const { availability, month, athletes } = await withTenant(org.id, async (tx) => {
    if (paymentView.kind !== "options") {
      return { availability: [], month: m ?? "", athletes: [] };
    }
    const now = new Date();
    // One cheap query to decide the opening month, then the month itself. Both
    // ranges are computed in the academy's zone (a month boundary is a wall-clock
    // fact, not a UTC one).
    const upcoming = await listSessionAvailability(tx, org.id, {
      groupTypeId: groupType.id,
      from: now,
      to: monthRangeInZone(shiftMonth(defaultMonthSeed(now, org.timezone), 12), org.timezone).to,
      now,
    });
    const chosenMonth = m ?? defaultMonth(upcoming, org.timezone, now);
    const range = monthRangeInZone(chosenMonth, org.timezone);
    const monthRows = await listSessionAvailability(tx, org.id, {
      groupTypeId: groupType.id,
      from: range.from,
      to: range.to,
      now,
    });
    return {
      availability: monthRows,
      month: chosenMonth,
      athletes: recognized ? await listAthletes(tx, org.id, recognized.clientId) : [],
    };
  });

  const grid =
    paymentView.kind === "options" ? buildMonthGrid(month, availability, org.timezone) : [];

  const policyDocument = groupType.policyDocumentId
    ? await withTenant(org.id, (tx) =>
        getActivePolicyForGroupType(tx, org.id, groupType.id),
      )
    : null;

  const latestAcceptance = recognized && policyDocument
    ? await withTenant(org.id, (tx) =>
        getLatestAcceptanceForClientGroupType(tx, org.id, recognized.clientId, groupType.id),
      )
    : null;

  // Faza 24 — active consent documents required at signup
  const consentDocuments = await withTenant(org.id, (tx) =>
    getActiveConsentsForSignup(tx, org.id),
  );

  // Faza 22: when an offer is collecting_interest, render the interest signup
  // form instead of the session calendar and booking flow (§2.34).
  if (groupType.status === "collecting_interest") {
    const interestAthletes = recognized
      ? await withTenant(org.id, (tx) =>
          listAthletes(tx, org.id, recognized.clientId),
        ).then((rows) => rows.map((a) => ({ id: a.id, name: a.name })))
      : [];

    return (
      <main>
        <h1 className="text-2xl font-semibold">{t("title", { name: groupType.name })}</h1>
        {groupType.description ? (
          <div className="text-muted-foreground mt-2 whitespace-pre-line">
            {groupType.description}
          </div>
        ) : null}
        <InterestSignupForm
          groupTypeSlug={groupTypeSlug}
          athletes={interestAthletes}
        />
      </main>
    );
  }

  // Faza 5, §2.32 — slot-first offers have no session calendar to browse; the
  // parent picks a trainer and a time from computed availability instead.
  if (groupType.engine === "slot_first") {
    if (paymentView.kind !== "options") {
      return (
        <main>
          <h1 className="text-2xl font-semibold">{t("title", { name: groupType.name })}</h1>
          {groupType.description ? (
            <div className="text-muted-foreground mt-2 whitespace-pre-line">
              {groupType.description}
            </div>
          ) : null}
          <EnrollmentFlow
            groupTypeSlug={groupTypeSlug}
            groupTypeName={groupType.name}
            price={groupType.price}
            discountedPrice={discountedPrice ?? undefined}
            currency={org.currency}
            isNewClientOnly={groupType.isNewClientOnly}
            requiresQualificationCard={groupType.requiresQualificationCard}
            paymentView={paymentView}
            month=""
            prevMonth=""
            nextMonth=""
            grid={[]}
            recognized={
              recognized
                ? {
                    email: recognized.email,
                    name: recognized.name,
                    athletes: [],
                  }
                : null
            }
            policyDocument={null}
            consentDocuments={[]}
          />
        </main>
      );
    }

    const slotFirst = await withTenant(org.id, async (tx) => {
      // Eligible trainers: `eligibleTrainerIds` when the academy set any,
      // otherwise every active trainer (§1.2). The `?trainerId=` prefill is
      // honoured only when it names an eligible trainer.
      const all = await listTrainers(tx, org.id);
      const eligible =
        groupType.eligibleTrainerIds && groupType.eligibleTrainerIds.length > 0
          ? all.filter((tr) => groupType.eligibleTrainerIds!.includes(tr.userId))
          : all;
      const eligibleIds = eligible.map((tr) => tr.userId);

      const now = new Date();
      const opening = m ?? defaultMonthForSlotFirst(eligibleIds, groupType, org.timezone, now);
      const range = monthRangeInZone(opening, org.timezone);

      const availability = await listSlotFirstAvailability(tx, org.id, {
        trainerIds: eligibleIds,
        defaultDurationMinutes: groupType.defaultDurationMinutes ?? 60,
        from: range.from,
        to: range.to,
        timeZone: org.timezone,
      });

      return {
        trainers: eligible.map((tr) => ({ id: tr.userId, name: tr.name ?? tr.email })),
        availability,
        month: opening,
        validTrainerId: trainerId && eligibleIds.includes(trainerId) ? trainerId : undefined,
      };
    });

    return (
      <main>
        <h1 className="text-2xl font-semibold">{t("title", { name: groupType.name })}</h1>
        {groupType.description ? (
          <div className="text-muted-foreground mt-2 whitespace-pre-line">
            {groupType.description}
          </div>
        ) : null}

        <SlotFirstFlow
          groupTypeSlug={groupTypeSlug}
          groupTypeName={groupType.name}
          price={groupType.price}
          discountedPrice={discountedPrice ?? undefined}
          currency={org.currency}
          isNewClientOnly={groupType.isNewClientOnly}
          requiresQualificationCard={groupType.requiresQualificationCard}
          methods={paymentView.methods}
          trainers={slotFirst.trainers}
          availability={slotFirst.availability}
          defaultTrainerId={slotFirst.validTrainerId}
          month={slotFirst.month}
          prevMonth={shiftMonth(slotFirst.month, -1)}
          nextMonth={shiftMonth(slotFirst.month, 1)}
          recognized={
            recognized
              ? {
                  email: recognized.email,
                  name: recognized.name,
                  athletes: athletes.map((a) => ({ id: a.id, name: a.name })),
                }
              : null
          }
          policyDocument={
            policyDocument
              ? {
                  id: policyDocument.id,
                  name: policyDocument.name,
                  version: policyDocument.version,
                  fileId: policyDocument.file_id,
                  requireReacceptance:
                    latestAcceptance !== null &&
                    policyDocument.version > latestAcceptance.policyDocumentVersion,
                }
              : null
          }
          consentDocuments={consentDocuments.map((d) => ({
            id: d.id,
            name: d.name,
            version: d.version,
            fileId: d.file_id,
          }))}
        />
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">{t("title", { name: groupType.name })}</h1>
      {groupType.description ? (
        <div className="text-muted-foreground mt-2 whitespace-pre-line">
          {groupType.description}
        </div>
      ) : null}

      <EnrollmentFlow
        groupTypeSlug={groupTypeSlug}
        groupTypeName={groupType.name}
        price={groupType.price}
        discountedPrice={discountedPrice ?? undefined}
        currency={org.currency}
        isNewClientOnly={groupType.isNewClientOnly}
        requiresQualificationCard={groupType.requiresQualificationCard}
        paymentView={paymentView}
        month={month}
        prevMonth={shiftMonth(month || todayMonth(org.timezone), -1)}
        nextMonth={shiftMonth(month || todayMonth(org.timezone), 1)}
        grid={grid}
        recognized={
          recognized
            ? {
                email: recognized.email,
                name: recognized.name,
                athletes: athletes.map((a) => ({ id: a.id, name: a.name })),
              }
            : null
        }
        policyDocument={
          policyDocument
            ? {
                id: policyDocument.id,
                name: policyDocument.name,
                version: policyDocument.version,
                fileId: policyDocument.file_id,
                requireReacceptance:
                  latestAcceptance !== null &&
                  policyDocument.version > latestAcceptance.policyDocumentVersion,
              }
            : null
        }
        consentDocuments={consentDocuments.map((d) => ({
          id: d.id,
          name: d.name,
          version: d.version,
          fileId: d.file_id,
        }))}
      />
    </main>
  );
}

/** The current `YYYY-MM` in the academy's zone — the seed for the upcoming-window probe. */
function defaultMonthSeed(now: Date, timeZone: string): string {
  return todayMonthWith(now, timeZone);
}

/**
 * The month a slot-first offer opens on. No probe of upcoming sessions (there is
 * no session calendar to scan): trainers publish `trainer_availability` windows
 * continuously, so the flow opens on the current month and the parent navigates.
 */
function defaultMonthForSlotFirst(
  _eligibleTrainerIds: string[],
  _groupType: { defaultDurationMinutes: number | null },
  timeZone: string,
  now: Date,
): string {
  return todayMonthWith(now, timeZone);
}

function todayMonth(timeZone: string): string {
  return todayMonthWith(new Date(), timeZone);
}

function todayMonthWith(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}
