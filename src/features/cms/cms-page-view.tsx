import type { ChaiBlock } from "@chaibuilder/sdk/types";

import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { PageStyles } from "@/features/cms/components/page-styles.client";
import { RefreshRouteOnSave } from "@/features/cms/components/refresh-route-on-save.client";
import { getBlocksCss } from "@/features/cms/get-blocks-css";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";

/**
 * Shared server-side wrapper for rendering a tenant CMS page with the org's
 * theme, block CSS and the ChaiBuilder renderer. Consolidates the pattern that
 * used to be duplicated across the public renderers ([locale]/page.tsx home,
 * (cms)/[...cmsSlug], and now not-found.tsx and future system-page routes).
 *
 * `refreshServerUrl`, when present, wires the live-preview auto-refresh into
 * the page (used by the editor's preview iframe).
 */
export async function CmsPageView({
  organizationId,
  blocks,
  pageType,
  slug = "/",
  externalData,
  refreshServerUrl,
}: {
  organizationId: string;
  blocks: ChaiBlock[];
  pageType: string;
  slug?: string;
  externalData?: Record<string, unknown>;
  refreshServerUrl?: string;
}) {
  const pageCss = await getBlocksCss(blocks);

  return (
    <ThemeInjector organizationId={organizationId}>
      <PageStyles css={pageCss} />
      {refreshServerUrl && <RefreshRouteOnSave serverURL={refreshServerUrl} />}
      <TenantPageRenderer blocks={blocks} slug={slug} pageType={pageType} externalData={externalData} />
    </ThemeInjector>
  );
}