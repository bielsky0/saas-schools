import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { servedOrganization } from "@/features/organizations/served-org";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { RefreshRouteOnSave } from "@/features/cms/components/refresh-route-on-save.client";
import { buildTenantOriginUrl } from "@/features/cms/preview-url";
import { withTenant } from "@/lib/db/tenant";
import {
  enrichBlogPostBlocks,
  getBlogPostBySlug,
  getBlogPostPreviewForPost,
} from "@/lib/block-data";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";
import { getBlocksCss } from "@/features/cms/get-blocks-css";
import { PageStyles } from "@/features/cms/components/page-styles.client";
import { loadGlobalData } from "@/features/cms/builder-providers";

export const dynamic = "force-dynamic";

type BlogPostProps = {
  params: Promise<{ slug: string }>;
};

async function getOrg() {
  const org = await servedOrganization();
  if (!org) notFound();
  return org;
}

/**
 * The tenant CMS renderer for a single blog post.
 *
 * NOT reachable by a public URL directly: `src/proxy.ts` rewrites tenant
 * `/blog/{slug}` to `/{locale}/blog-post/{slug}` so the request avoids the apex
 * marketing route `(marketing)/blog/[slug]`, which is a specific segment and
 * would otherwise shadow this route's sibling catch-all `(cms)/[...cmsSlug]`.
 * The browser keeps seeing `/blog/{slug}`.
 *
 * Slugs are stored clean (no leading `/`), matching `builder-providers.ts` and
 * `features/blog/data.ts`.
 */
export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const org = await servedOrganization();
  if (!org) return {};

  const { slug } = await params;
  const post = await withTenant(org.id, (tx) =>
    getBlogPostBySlug(tx, org.id, slug.replace(/^\//, "")),
  );
  if (!post) return {};

  const seo = (post.seo ?? {}) as {
    title?: string;
    description?: string;
    ogImage?: string;
    noIndex?: boolean;
  };
  return {
    title: seo.title ?? post.title,
    description: seo.description,
    ...(seo.noIndex ? { robots: { index: false } as const } : {}),
    openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const org = await getOrg();

  const { slug } = await params;
  const post = await withTenant(org.id, (tx) =>
    getBlogPostBySlug(tx, org.id, slug.replace(/^\//, "")),
  );
  if (!post || post.status !== "published") notFound();

  const preview = await withTenant(org.id, (tx) => getBlogPostPreviewForPost(tx, post));
  const enrichedBlocks = await withTenant(org.id, (tx) =>
    enrichBlogPostBlocks(tx, org.id, post.blocks, preview),
  );
  const global = await loadGlobalData();

  const h = await headers();
  const host = h.get("host") || "";
  const serverURL = buildTenantOriginUrl(host, "") || `http://${host}`;
  const pageCss = await getBlocksCss(enrichedBlocks);

  return (
    <ThemeInjector organizationId={org.id}>
      <PageStyles css={pageCss} />
      <RefreshRouteOnSave serverURL={serverURL} />
      <TenantPageRenderer
        blocks={enrichedBlocks}
        slug={post.slug}
        pageType={post.pageType}
        externalData={{ blog: preview, global }}
      />
    </ThemeInjector>
  );
}