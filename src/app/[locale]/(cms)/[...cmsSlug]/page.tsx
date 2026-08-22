import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { servedOrganization } from "@/features/organizations/served-org";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { RefreshRouteOnSave } from "@/features/cms/components/refresh-route-on-save.client";
import { buildTenantOriginUrl } from "@/features/cms/preview-url";
import { withTenant } from "@/lib/db/tenant";
import { getPageBySlug, getBlogIndexPage } from "@/lib/page-service";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";
import { getBlocksCss } from "@/features/cms/get-blocks-css";
import { PageStyles } from "@/features/cms/components/page-styles.client";
import { enrichBlocksWithData, enrichBlogPostBlocks, getBlogPostBySlug, getBlogPosts, getBlogPostPreviewForPost } from "@/lib/block-data";
import { BlogList } from "@/features/cms/components/blog-list";
import { loadGlobalData } from "@/features/cms/builder-providers";

export const dynamic = "force-dynamic";

type CmsPageProps = {
  params: Promise<{ cmsSlug: string[] }>;
};

async function getOrg() {
  const org = await servedOrganization();
  if (!org) notFound();
  return org;
}

function parseSlug(cmsSlug: string[]): {
  kind: "blog-index" | "blog-post";
  blogSlug: string;
} | { kind: "page"; raw: string } {
  const raw = "/" + cmsSlug.join("/");

  if (raw === "/blog") return { kind: "blog-index", blogSlug: "" };
  if (raw.startsWith("/blog/")) {
    return { kind: "blog-post", blogSlug: raw.replace("/blog/", "") };
  }
  return { kind: "page", raw };
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const org = await servedOrganization();
  if (!org) return {};

  const { cmsSlug } = await params;
  const parsed = parseSlug(cmsSlug);

  if (parsed.kind === "blog-index") {
    return { title: "Blog" };
  }

  if (parsed.kind === "blog-post") {
    const post = await withTenant(org.id, (tx) =>
      getBlogPostBySlug(tx, org.id, parsed.blogSlug.replace(/^\//, "")),
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

  const page = await withTenant(org.id, (tx) => getPageBySlug(tx, org.id, parsed.kind === "page" ? parsed.raw : "/"));
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
  const org = await getOrg();

  const { cmsSlug } = await params;
  const parsed = parseSlug(cmsSlug);

  if (parsed.kind === "blog-index") {
    const blogIndexPage = await withTenant(org.id, (tx) => getBlogIndexPage(tx, org.id));
    if (!blogIndexPage) {
      const posts = await withTenant(org.id, (tx) => getBlogPosts(tx, org.id));
      return (
        <ThemeInjector organizationId={org.id}>
          <BlogList posts={posts} />
        </ThemeInjector>
      );
    }

    const enrichedBlocks = await withTenant(org.id, (tx) =>
      enrichBlocksWithData(tx, org.id, blogIndexPage.blocks),
    );
    const global = await loadGlobalData();
    const pageCss = await getBlocksCss(blogIndexPage.blocks);

    return (
      <ThemeInjector organizationId={org.id}>
        <PageStyles css={pageCss} />
        <TenantPageRenderer
          blocks={enrichedBlocks}
          slug="blog"
          pageType="blog_index"
          externalData={{ global }}
        />
      </ThemeInjector>
    );
  }

  if (parsed.kind === "blog-post") {
    const post = await withTenant(org.id, (tx) =>
      getBlogPostBySlug(tx, org.id, parsed.blogSlug.replace(/^\//, "")),
    );
    if (!post || post.status !== "published") notFound();

    const preview = await withTenant(org.id, (tx) =>
      getBlogPostPreviewForPost(tx, post),
    );
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

  const page = await withTenant(org.id, (tx) => getPageBySlug(tx, org.id, parsed.kind === "page" ? parsed.raw : "/"));
  if (!page || page.status !== "published") notFound();

  const enrichedBlocks = await withTenant(org.id, (tx) =>
    enrichBlocksWithData(tx, org.id, page.blocks),
  );

  const global = await loadGlobalData();

  const h = await headers();
  const host = h.get("host") || "";
  const serverURL = buildTenantOriginUrl(host, "") || `http://${host}`;

  const pageCss = await getBlocksCss(page.blocks);

  return (
    <ThemeInjector organizationId={org.id}>
      <PageStyles css={pageCss} />
      <RefreshRouteOnSave serverURL={serverURL} />
      <TenantPageRenderer
        blocks={enrichedBlocks}
        slug={page.slug}
        pageType={page.pageType}
        externalData={{ global }}
      />
    </ThemeInjector>
  );
}
