import { servedOrganization, servedSubdomain } from "@/features/organizations/served-org";
import { CmsPageView } from "@/features/cms/cms-page-view";
import { loadGlobalData } from "@/features/cms/builder-providers";
import { withTenant } from "@/lib/db/tenant";
import { getPageByType } from "@/lib/page-service";
import { enrichBlocksWithData } from "@/lib/block-data";
import { SYSTEM_PAGE_TYPES } from "@/lib/system-pages";

/**
 * Tenant 404 (mvp-plan F1): an unknown route on an academy host renders the
 * org's editable `system_404` page (via the ChaiBuilder renderer + theme).
 *
 * Falls back to a plain default 404 — never marketing content — when the
 * request is not on an academy host, the subdomain resolves to no org, or the
 * org has no published `system_404` page (D57: unknown subdomains must not
 * serve marketing).
 */
function DefaultNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Nie znaleźliśmy strony, której szukasz.</p>
    </div>
  );
}

export default async function NotFound() {
  if (!(await servedSubdomain())) return <DefaultNotFound />;

  const org = await servedOrganization();
  if (!org) return <DefaultNotFound />;

  const page = await withTenant(org.id, (tx) =>
    getPageByType(tx, org.id, SYSTEM_PAGE_TYPES.notFound, { status: "published" }),
  );
  if (!page) return <DefaultNotFound />;

  const enrichedBlocks = await withTenant(org.id, (tx) =>
    enrichBlocksWithData(tx, org.id, page.blocks),
  );
  const global = await loadGlobalData();

  return (
    <CmsPageView
      organizationId={org.id}
      blocks={enrichedBlocks}
      slug="404"
      pageType={page.pageType}
      externalData={{ global }}
    />
  );
}