import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { servedOrganization } from "@/features/organizations/served-org";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { RefreshRouteOnSave } from "@/features/cms/components/refresh-route-on-save.client";
import { buildTenantOriginUrl } from "@/features/cms/preview-url";
import { withTenant } from "@/lib/db/tenant";
import { getPageBySlug } from "@/lib/page-service";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";

/**
 * An academy's public CMS page.
 *
 * Every path on a tenant host that the app router does not own reaches here
 * (via locale-prefixed URL, e.g. /pl/kontakt). The academy's home page (empty
 * slug) does NOT arrive here — that is handled in [locale]/page.tsx.
 *
 * Pages are fetched from the Drizzle `page` table (not Payload's `pages`),
 * because the ChaiBuilder editor writes to the Drizzle schema.
 */
export const dynamic = "force-dynamic";

type CmsPageProps = {
  params: Promise<{ cmsSlug: string[] }>;
};

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const org = await servedOrganization();
  if (!org) return {};

  const { cmsSlug } = await params;
  const slug = "/" + cmsSlug.join("/");

  const page = await withTenant(org.id, (tx) => getPageBySlug(tx, org.id, slug));
  if (!page || page.status !== "published") return {};

  const seo = (page.seo ?? {}) as {
    title?: string;
    description?: string;
    ogImage?: string;
    noIndex?: boolean;
  };

  return {
    title: seo.title ?? page.title,
    description: seo.description,
    ...(seo.noIndex ? { robots: { index: false } as const } : {}),
    openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
  };
}

export default async function CmsPage({ params }: CmsPageProps) {
  const org = await servedOrganization();
  if (!org) notFound();

  const { cmsSlug } = await params;
  const slug = "/" + cmsSlug.join("/");

  const page = await withTenant(org.id, (tx) => getPageBySlug(tx, org.id, slug));
  if (!page || page.status !== "published") notFound();

  const h = await headers();
  const host = h.get("host") || "";
  const serverURL = buildTenantOriginUrl(host, "") || `http://${host}`;

  return (
    <ThemeInjector organizationId={org.id}>
      <RefreshRouteOnSave serverURL={serverURL} />
      <TenantPageRenderer blocks={page.blocks} />
    </ThemeInjector>
  );
}
