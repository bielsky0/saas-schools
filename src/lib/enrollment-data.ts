import { and, eq, isNull } from "drizzle-orm";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { EnrollmentPreview } from "@chaibuilder/sdk/runtime";

import { buildMonthGrid, defaultMonth } from "@/features/bookings/calendar";
import {
  listSessionAvailability,
  listSlotFirstAvailability,
} from "@/features/bookings/data";
import {
  paymentOptionsFor,
  type PackageTeaser,
  type PaymentMethodView,
  type PaymentOptionsView,
} from "@/features/bookings/payment-options";
import { resolveClientSession } from "@/features/client-auth/session";
import { listAthletes } from "@/features/clients/data";
import { getActiveConsentsForSignup } from "@/features/consents/data";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { getActivePolicyForGroupType, getLatestAcceptanceForClientGroupType } from "@/features/policies/data";
import { resolveClientPrice } from "@/features/pricing/resolve";
import { listTrainers } from "@/features/trainers/data";
import { creditType, groupType as groupTypeTable, productTemplate } from "@/lib/db/schema";
import { page } from "@/lib/db/schema/pages";
import type { TenantDb } from "@/lib/db/tenant";
import { monthRangeInZone, shiftMonth } from "@/lib/datetime";
import { getCollectionByKey, getTemplateOf } from "@/lib/cms-collection-data";
import {
  enrichBlocksWithData,
  getUpcomingSessionsForBlock,
} from "@/lib/block-data";
import type { CalendarDay } from "@/features/bookings/calendar";
import type { ComputedSlot } from "@/features/trainers/availability-slots";

/**
 * Enrollment collection data (mvp-plan F2).
 *
 * Mirrors the blog module (`block-data.ts`): public renderers and the builder
 * share one tenant-scoped data layer. The "enrollments" collection is a
 * Shopify-style model — the product is a `group_type`, the detail page is a
 * ChaiBuilder layout (`enrollment_template`), and `/zapisy` is the listing.
 * A GroupType has NO `page` row: its landing page is always rendered from the
 * org's default (or customized) enrollment template, enriched with the group's
 * live data (packages, availability, trainers, policy, consents).
 */

// ── Types ────────────────────────────────────────────────────────────────

export type EnrollmentOrg = {
  id: string;
  timezone: string;
  currency: string;
  stripeConnectChargesEnabled: boolean | null;
};

export type EnrollmentGroupType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: "scheduled" | "collecting_interest";
  engine: "schedule_first" | "availability_first" | "slot_first";
  paymentPolicy: "online" | "on_site" | "both";
  allowedPurchaseModes: ("single_class" | "package")[];
  allowedBillingTypes: ("one_time" | "recurring")[] | null;
  isNewClientOnly: boolean;
  requiresQualificationCard: boolean;
  defaultDurationMinutes: number | null;
};

type GroupTypeRow = typeof groupTypeTable.$inferSelect;

export type EnrollmentRecognized = {
  email: string;
  name: string | null;
  athletes: { id: string; name: string }[];
};

export type EnrollmentConsentProp = {
  id: string;
  name: string;
  version: number;
  fileId: string | null;
};

export type EnrollmentPolicyProp = {
  id: string;
  name: string;
  version: number;
  fileId: string;
  requireReacceptance: boolean;
};

/**
 * Everything the booking widget (the `EnrollmentBookingFlow` block) needs to
 * render — computed server-side per request, exactly like the legacy hardcoded
 * `/zapisy/{slug}` page did. Discriminated on `kind`:
 *   - "interest"    → `collecting_interest` offer: render the interest form.
 *   - "slot_first"  → slot-first engine with payment options: `SlotFirstFlow`.
 *   - "flow"        → everything else: `EnrollmentFlow` (schedule/availability
 *                    calendars, packages, notices).
 */
export type EnrollmentBookingPayload =
  | {
      kind: "interest";
      groupTypeSlug: string;
      groupTypeName: string;
      groupTypeDescription: string | null;
      athletes: { id: string; name: string }[];
    }
  | {
      kind: "slot_first";
      groupTypeSlug: string;
      groupTypeName: string;
      price: number;
      discountedPrice?: number;
      currency: string;
      isNewClientOnly: boolean;
      requiresQualificationCard: boolean;
      methods: PaymentMethodView[];
      trainers: { id: string; name: string | null }[];
      availability: { trainerId: string; slots: ComputedSlot[] }[];
      defaultTrainerId?: string;
      month: string;
      prevMonth: string;
      nextMonth: string;
      recognized: EnrollmentRecognized | null;
      policyDocument: EnrollmentPolicyProp | null;
      consentDocuments: EnrollmentConsentProp[];
    }
  | {
      kind: "flow";
      groupTypeSlug: string;
      groupTypeName: string;
      price: number;
      discountedPrice?: number;
      currency: string;
      isNewClientOnly: boolean;
      requiresQualificationCard: boolean;
      paymentView: PaymentOptionsView;
      month: string;
      prevMonth: string;
      nextMonth: string;
      grid: CalendarDay[];
      recognized: EnrollmentRecognized | null;
      policyDocument: EnrollmentPolicyProp | null;
      consentDocuments: EnrollmentConsentProp[];
    };

export type EnrollmentListBlockItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  status: string;
};

// ── Data access ──────────────────────────────────────────────────────────

/** Active product templates of a group type (packages/subscriptions). */
async function loadPackageTeasers(
  tx: TenantDb,
  orgId: string,
  groupTypeId: string,
): Promise<PackageTeaser[]> {
  const [ct] = await tx
    .select({ id: creditType.id })
    .from(creditType)
    .where(
      and(
        eq(creditType.groupTypeId, groupTypeId),
        eq(creditType.organizationId, orgId),
        isNull(creditType.deletedAt),
      ),
    )
    .limit(1);
  if (!ct) return [];

  return tx
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
        eq(productTemplate.organizationId, orgId),
        eq(productTemplate.isActive, true),
      ),
    );
}

function toEnrollmentGroupType(gt: GroupTypeRow): EnrollmentGroupType {
  return {
    id: gt.id,
    name: gt.name,
    slug: gt.slug,
    description: gt.description,
    price: gt.price,
    status: gt.status,
    engine: gt.engine,
    paymentPolicy: gt.paymentPolicy,
    allowedPurchaseModes: gt.allowedPurchaseModes,
    allowedBillingTypes: gt.allowedBillingTypes ?? null,
    isNewClientOnly: gt.isNewClientOnly,
    requiresQualificationCard: gt.requiresQualificationCard,
    defaultDurationMinutes: gt.defaultDurationMinutes,
  };
}

async function loadPolicyAndConsents(
  tx: TenantDb,
  orgId: string,
  groupTypeId: string,
): Promise<{ policyDocument: EnrollmentPolicyProp | null; consentDocuments: EnrollmentConsentProp[] }> {
  const policy = groupTypeId
    ? await getActivePolicyForGroupType(tx, orgId, groupTypeId)
    : null;
  const consents = await getActiveConsentsForSignup(tx, orgId);
  return {
    policyDocument: policy
      ? { id: policy.id, name: policy.name, version: policy.version, fileId: policy.file_id, requireReacceptance: false }
      : null,
    consentDocuments: consents.map((d) => ({
      id: d.id,
      name: d.name,
      version: d.version,
      fileId: d.file_id,
    })),
  };
}

/** The `EnrollmentPreview` a builder canvas / public renderer feeds enrollment blocks. */
export async function getEnrollmentPreviewForGroup(
  tx: TenantDb,
  orgId: string,
  gt: GroupTypeRow,
): Promise<EnrollmentPreview> {
  const [packages, availability, all, policy, consents] = await Promise.all([
    loadPackageTeasers(tx, orgId, gt.id),
    getUpcomingSessionsForBlock(tx, orgId, { groupTypeId: gt.id, limit: 10 }),
    listTrainers(tx, orgId),
    gt.policyDocumentId ? getActivePolicyForGroupType(tx, orgId, gt.id) : Promise.resolve(null),
    getActiveConsentsForSignup(tx, orgId),
  ]);
  const eligible =
    gt.eligibleTrainerIds && gt.eligibleTrainerIds.length > 0
      ? all.filter((tr) => gt.eligibleTrainerIds!.includes(tr.userId))
      : all;

  return {
    groupType: toEnrollmentGroupType(gt),
    packages,
    availability: availability.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    })),
    trainers: eligible.map((tr) => ({
      userId: tr.userId,
      email: tr.email,
      name: tr.name,
      image: null,
      role: "trainer",
    })),
    policy: policy ? { id: policy.id, name: policy.name, version: policy.version } : null,
    consents: consents.map((d) => ({ id: d.id, name: d.name, version: d.version })),
  };
}

export async function getEnrollmentPreviewBySlug(
  tx: TenantDb,
  orgId: string,
  slug: string,
): Promise<EnrollmentPreview | null> {
  const gt = await getGroupTypeBySlug(tx, orgId, slug);
  if (!gt || gt.deletedAt) return null;
  return getEnrollmentPreviewForGroup(tx, orgId, gt);
}

/** Published offers for the `/zapisy` listing (`EnrollmentList` block). */
export async function getEnrollmentListForBlock(
  tx: TenantDb,
  orgId: string,
): Promise<EnrollmentListBlockItem[]> {
  const rows = await tx
    .select()
    .from(groupTypeTable)
    .where(
      and(
        eq(groupTypeTable.organizationId, orgId),
        isNull(groupTypeTable.deletedAt),
      ),
    )
    .orderBy(groupTypeTable.name);
  return rows.map((gt) => ({
    id: gt.id,
    name: gt.name,
    slug: gt.slug,
    price: gt.price,
    description: gt.description,
    status: gt.status,
  }));
}

// ── Booking payload (moved from the legacy /zapisy/[groupTypeSlug] page) ─

/** The current `YYYY-MM` in the academy's zone. */
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

function defaultMonthSeed(now: Date, timeZone: string): string {
  return todayMonthWith(now, timeZone);
}

export async function getEnrollmentBookingPayload(
  tx: TenantDb,
  org: EnrollmentOrg,
  groupType: GroupTypeRow,
  opts: { m?: string; trainerId?: string } = {},
): Promise<EnrollmentBookingPayload> {
  const { m, trainerId } = opts;
  const packages = await loadPackageTeasers(tx, org.id, groupType.id);

  const principal = await resolveClientSession(org.id);
  const recognizedPrincipal = principal?.isVerified ? principal : null;

  const discountedPrice = recognizedPrincipal
    ? await resolveClientPrice(tx, recognizedPrincipal.clientId, groupType.id, groupType.price)
    : null;

  const paymentView = paymentOptionsFor(
    {
      paymentPolicy: groupType.paymentPolicy,
      allowedPurchaseModes: groupType.allowedPurchaseModes,
      allowedBillingTypes: groupType.allowedBillingTypes,
    },
    { onlineAvailable: org.stripeConnectChargesEnabled ?? false, packages },
  );

  // `collecting_interest` — render the interest signup form instead of a calendar.
  if (groupType.status === "collecting_interest") {
    const interestAthletes = recognizedPrincipal
      ? (await listAthletes(tx, org.id, recognizedPrincipal.clientId)).map((a) => ({
          id: a.id,
          name: a.name,
        }))
      : [];
    return {
      kind: "interest",
      groupTypeSlug: groupType.slug,
      groupTypeName: groupType.name,
      groupTypeDescription: groupType.description,
      athletes: interestAthletes,
    };
  }

  const recognized = recognizedPrincipal
    ? {
        email: recognizedPrincipal.email,
        name: recognizedPrincipal.name,
        athletes: recognizedPrincipal
          ? (await listAthletes(tx, org.id, recognizedPrincipal.clientId)).map((a) => ({
              id: a.id,
              name: a.name,
            }))
          : [],
      }
    : null;

  // Slot-first — no session calendar; the parent picks a trainer and a time.
  if (groupType.engine === "slot_first") {
    if (paymentView.kind !== "options") {
      const { policyDocument, consentDocuments } = await loadPolicyAndConsents(tx, org.id, groupType.id);
      return {
        kind: "flow",
        groupTypeSlug: groupType.slug,
        groupTypeName: groupType.name,
        price: groupType.price,
        discountedPrice: discountedPrice ?? undefined,
        currency: org.currency,
        isNewClientOnly: groupType.isNewClientOnly,
        requiresQualificationCard: groupType.requiresQualificationCard,
        paymentView,
        month: "",
        prevMonth: shiftMonth(m || todayMonthWith(new Date(), org.timezone), -1),
        nextMonth: shiftMonth(m || todayMonthWith(new Date(), org.timezone), 1),
        grid: [],
        recognized,
        policyDocument,
        consentDocuments,
      };
    }

    const all = await listTrainers(tx, org.id);
    const eligible =
      groupType.eligibleTrainerIds && groupType.eligibleTrainerIds.length > 0
        ? all.filter((tr) => groupType.eligibleTrainerIds!.includes(tr.userId))
        : all;
    const eligibleIds = eligible.map((tr) => tr.userId);

    const now = new Date();
    const opening = m ?? todayMonthWith(now, org.timezone);
    const range = monthRangeInZone(opening, org.timezone);

    const availability = await listSlotFirstAvailability(tx, org.id, {
      trainerIds: eligibleIds,
      defaultDurationMinutes: groupType.defaultDurationMinutes ?? 60,
      from: range.from,
      to: range.to,
      timeZone: org.timezone,
    });

    const { policyDocument, consentDocuments } = await loadPolicyAndConsents(tx, org.id, groupType.id);
    const latestAcceptance =
      recognizedPrincipal && policyDocument
        ? await getLatestAcceptanceForClientGroupType(tx, org.id, recognizedPrincipal.clientId, groupType.id)
        : null;

    return {
      kind: "slot_first",
      groupTypeSlug: groupType.slug,
      groupTypeName: groupType.name,
      price: groupType.price,
      discountedPrice: discountedPrice ?? undefined,
      currency: org.currency,
      isNewClientOnly: groupType.isNewClientOnly,
      requiresQualificationCard: groupType.requiresQualificationCard,
      methods: paymentView.methods,
      trainers: eligible.map((tr) => ({ id: tr.userId, name: tr.name ?? tr.email })),
      availability,
      defaultTrainerId: trainerId && eligibleIds.includes(trainerId) ? trainerId : undefined,
      month: opening,
      prevMonth: shiftMonth(opening, -1),
      nextMonth: shiftMonth(opening, 1),
      recognized,
      policyDocument: policyDocument
        ? {
            ...policyDocument,
            requireReacceptance:
              latestAcceptance !== null && policyDocument.version > latestAcceptance.policyDocumentVersion,
          }
        : null,
      consentDocuments,
    };
  }

  // Schedule-first / availability-first — the month session calendar.
  const now = new Date();
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

  const grid = paymentView.kind === "options" ? buildMonthGrid(chosenMonth, monthRows, org.timezone) : [];
  const { policyDocument, consentDocuments } = await loadPolicyAndConsents(tx, org.id, groupType.id);
  const latestAcceptance =
    recognizedPrincipal && policyDocument
      ? await getLatestAcceptanceForClientGroupType(tx, org.id, recognizedPrincipal.clientId, groupType.id)
      : null;

  return {
    kind: "flow",
    groupTypeSlug: groupType.slug,
    groupTypeName: groupType.name,
    price: groupType.price,
    discountedPrice: discountedPrice ?? undefined,
    currency: org.currency,
    isNewClientOnly: groupType.isNewClientOnly,
    requiresQualificationCard: groupType.requiresQualificationCard,
    paymentView,
    month: chosenMonth,
    prevMonth: shiftMonth(chosenMonth || todayMonthWith(now, org.timezone), -1),
    nextMonth: shiftMonth(chosenMonth || todayMonthWith(now, org.timezone), 1),
    grid,
    recognized,
    policyDocument: policyDocument
      ? {
          ...policyDocument,
          requireReacceptance:
            latestAcceptance !== null && policyDocument.version > latestAcceptance.policyDocumentVersion,
        }
      : null,
    consentDocuments,
  };
}

// ── Template / listing pages ─────────────────────────────────────────────

import {
  ENROLLMENT_COLLECTION_KEY,
  ENROLLMENT_TEMPLATE_KEY,
  buildDefaultEnrollmentTemplateBlocks,
  buildDefaultEnrollmentListingBlocks,
} from "./enrollment-blocks";

export {
  ENROLLMENT_COLLECTION_KEY,
  ENROLLMENT_TEMPLATE_KEY,
  buildDefaultEnrollmentTemplateBlocks,
  buildDefaultEnrollmentListingBlocks,
};

/** The enrollment collection's template variants (mirrors `getBlogTemplates`). */
export async function getEnrollmentTemplates(
  tx: TenantDb,
  orgId: string,
): Promise<{ id: string; name: string; layout: string }[]> {
  const collection = await getCollectionByKey(tx, orgId, ENROLLMENT_COLLECTION_KEY);
  return collection?.templates.map((t) => ({ id: t.id, name: t.name, layout: t.layout })) ?? [];
}

async function loadTemplatePageBlocks(
  tx: TenantDb,
  orgId: string,
  collection: Awaited<ReturnType<typeof getCollectionByKey>>,
  templateId: string,
): Promise<ChaiBlock[] | null> {
  const template = collection ? getTemplateOf(collection, templateId) : null;
  if (!collection || !template) return null;
  const [tplPage] = await tx
    .select({ blocks: page.blocks })
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.pageType, collection.templatePageType),
        eq(page.slug, template.id),
      ),
    )
    .limit(1);
  return tplPage?.blocks && tplPage.blocks.length > 0 ? tplPage.blocks : null;
}

/**
 * Resolve the blocks that render a group type's landing page. Fallback chain
 * so a group ALWAYS has a template (mvp-plan F2):
 *   chosen template page → default template page → built-in default layout.
 * A stored `templateId` that no longer resolves (template deleted) falls back
 * to the default template instead of rendering nothing.
 */
export async function getEnrollmentTemplateBlocks(
  tx: TenantDb,
  orgId: string,
  templateId: string = ENROLLMENT_TEMPLATE_KEY,
): Promise<ChaiBlock[]> {
  const collection = await getCollectionByKey(tx, orgId, ENROLLMENT_COLLECTION_KEY);
  const requested = await loadTemplatePageBlocks(tx, orgId, collection, templateId);
  if (requested) return requested;
  if (templateId !== ENROLLMENT_TEMPLATE_KEY) {
    const def = await loadTemplatePageBlocks(tx, orgId, collection, ENROLLMENT_TEMPLATE_KEY);
    if (def) return def;
  }
  return buildDefaultEnrollmentTemplateBlocks();
}

/** The org's editable `/zapisy` listing page (`enrollment_listing`), if any. */
export async function getEnrollmentListingPage(tx: TenantDb, orgId: string) {
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.pageType, "enrollment_listing"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Lazy-create the `/zapisy` listing page — mirrors `createDefaultBlogIndexPage`. */
export async function createDefaultEnrollmentListingPage(
  tx: TenantDb,
  orgId: string,
  createdByUserId?: string | null,
) {
  const existing = await getEnrollmentListingPage(tx, orgId);
  if (existing) return existing;
  const [row] = await tx
    .insert(page)
    .values({
      organizationId: orgId,
      slug: "zapisy",
      title: "Zapisy",
      pageType: "enrollment_listing",
      blocks: buildDefaultEnrollmentListingBlocks(),
      status: "published",
      isHome: false,
      createdByUserId: createdByUserId ?? null,
      publishedAt: new Date(),
    })
    .returning();
  return row ?? null;
}

// ── Block enrichment (public rendering) ──────────────────────────────────

/** Dedicated detail blocks that read `data` = the group's `EnrollmentPreview`. */
const ENROLLMENT_PREVIEW_BLOCK_TYPES = new Set([
  "EnrollmentHero",
  "EnrollmentSchedule",
  "EnrollmentPricing",
  "EnrollmentInstructors",
  "EnrollmentPolicy",
]);

/**
 * Enrich template blocks for a group type's landing page: run the generic
 * enrichment and inject the group's preview into the dedicated enrollment
 * blocks. The booking widget is fed separately via `getEnrollmentBookingPayload`
 * (per-request, query-param aware) — see the public route.
 */
export async function enrichEnrollmentBlocks(
  tx: TenantDb,
  orgId: string,
  blocks: ChaiBlock[],
  preview: EnrollmentPreview,
): Promise<ChaiBlock[]> {
  const enriched = await enrichBlocksWithData(tx, orgId, blocks);
  return enriched.map((block) =>
    ENROLLMENT_PREVIEW_BLOCK_TYPES.has(block._type)
      ? { ...block, data: preview }
      : block,
  );
}

/** Enrich the `/zapisy` listing blocks with the published offers. */
export async function enrichEnrollmentListingBlocks(
  tx: TenantDb,
  orgId: string,
  blocks: ChaiBlock[],
): Promise<ChaiBlock[]> {
  const enriched = await enrichBlocksWithData(tx, orgId, blocks);
  const items = await getEnrollmentListForBlock(tx, orgId);
  return enriched.map((block) =>
    block._type === "EnrollmentList" ? { ...block, data: { items } } : block,
  );
}