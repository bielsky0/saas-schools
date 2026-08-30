import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsPageView } from "@/features/cms/cms-page-view";
import { loadGlobalData, registerBuilderProviders } from "@/features/cms/builder-providers";
import { getGroupTypeBySlug } from "@/features/groups/data";
import { requireServedOrganization } from "@/features/organizations/served-org";
import {
  buildDefaultEnrollmentListingBlocks,
  createDefaultEnrollmentListingPage,
  ENROLLMENT_TEMPLATE_KEY,
  enrichEnrollmentBlocks,
  enrichEnrollmentListingBlocks,
  getEnrollmentBookingPayload,
  getEnrollmentPreviewForGroup,
  getEnrollmentTemplateBlocks,
} from "@/lib/enrollment-data";
import { withTenant } from "@/lib/db/tenant";

registerBuilderProviders();

/**
 * Public enrollment resolver — `/zapisy` and `/zapisy/{slug}` (mvp-plan F2).
 *
 * Replaces the legacy hardcoded `[groupTypeSlug]` page: the group's landing
 * page is now a ChaiBuilder layout (`enrollment_template`, one default template
 * per org) rendered with the group's live data. The interactive booking widget
 * (`EnrollmentBookingFlow` block) is fed the same payload the old page computed,
 * so booking, payments and consents still work — inline, in the editor-defined
 * section.
 *
 * ⚠️ `requireServedOrganization()` IS THE FIRST STATEMENT, before params, before
 * any query. On the apex the proxy forwards `/zapisy/*` here via an early return
 * that skips default-deny (see reserved-slugs.ts / proxy.ts): this call is the
 * ONLY thing that makes that safe, `notFound()`ing for the apex, a foreign host
 * or an unknown academy alike. Pinned by e2e/langlion-subdomain-routing.spec.ts.
 */
export const dynamic = "force-dynamic";

type EnrollmentCmsPageProps = {
  params: Promise<{ slug?: string[] | undefined }>;
  searchParams: Promise<{ m?: string; trainerId?: string }>;
};

export async function generateMetadata({ params }: EnrollmentCmsPageProps): Promise<Metadata> {
  const org = await requireServedOrganization();
  const { slug: slugArray } = await params;
  const slug = slugArray?.[0] ?? "";
  if (!slug) return { title: "Zapisy" };

  const groupType = await withTenant(org.id, (tx) => getGroupTypeBySlug(tx, org.id, slug));
  if (!groupType) return {};
  return {
    title: groupType.name,
    description: groupType.description ?? undefined,
  };
}

export default async function EnrollmentCmsPage({ params, searchParams }: EnrollmentCmsPageProps) {
  const org = await requireServedOrganization();
  const { slug: slugArray } = await params;
  const { m, trainerId } = await searchParams;

  // ── Listing: `/zapisy` ─────────────────────────────────────────────────
  if (!slugArray || slugArray.length === 0) {
    const listingPage = await withTenant(org.id, (tx) =>
      createDefaultEnrollmentListingPage(tx, org.id),
    );
    const blocks =
      listingPage?.blocks && listingPage.blocks.length > 0
        ? listingPage.blocks
        : buildDefaultEnrollmentListingBlocks();
    const enriched = await withTenant(org.id, (tx) =>
      enrichEnrollmentListingBlocks(tx, org.id, blocks),
    );
    const global = await loadGlobalData();
    return (
      <CmsPageView
        organizationId={org.id}
        blocks={enriched}
        slug="zapisy"
        pageType="enrollment_listing"
        externalData={{ global }}
      />
    );
  }

  // ── Detail: `/zapisy/{groupTypeSlug}` ──────────────────────────────────
  if (slugArray.length > 1) notFound();
  const groupTypeSlug = slugArray[0]!;

  const { groupType, preview, templateBlocks, bookingPayload } = await withTenant(
    org.id,
    async (tx) => {
      const gt = await getGroupTypeBySlug(tx, org.id, groupTypeSlug);
      if (!gt) return { groupType: null, preview: null, templateBlocks: [], bookingPayload: null };
      const [preview, templateBlocks, bookingPayload] = await Promise.all([
        getEnrollmentPreviewForGroup(tx, org.id, gt),
        getEnrollmentTemplateBlocks(tx, org.id, gt.enrollmentTemplateId ?? ENROLLMENT_TEMPLATE_KEY),
        getEnrollmentBookingPayload(tx, org, gt, { m, trainerId }),
      ]);
      return { groupType: gt, preview, templateBlocks, bookingPayload };
    },
  );
  if (!groupType || !preview || !bookingPayload) notFound();

  // Static enrollment blocks get the group preview; the booking widget gets the
  // full per-request payload (calendar month, payment methods, consents, etc.).
  const enrichedBlocks = await withTenant(org.id, async (tx) => {
    const base = await enrichEnrollmentBlocks(tx, org.id, templateBlocks, preview);
    return base.map((block) =>
      block._type === "EnrollmentBookingFlow" ? { ...block, data: bookingPayload } : block,
    );
  });

  const global = await loadGlobalData();
  return (
    <CmsPageView
      organizationId={org.id}
      blocks={enrichedBlocks}
      slug={groupTypeSlug}
      pageType="enrollment_detail"
      externalData={{ enrollment: preview, global }}
    />
  );
}