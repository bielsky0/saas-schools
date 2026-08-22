import type { ChaiPageProps } from "@chaibuilder/sdk/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { servedOrganization } from "@/features/organizations/served-org";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { withTenant } from "@/lib/db/tenant";
import { getPageBySlug, getHomePage } from "@/lib/page-service";
import { getBlocksCss } from "@/features/cms/get-blocks-css";
import { loadGlobalData, registerBuilderProviders } from "@/features/cms/builder-providers";
import { getBlogPostBySlug, getBlogPostPreviewForPost } from "@/lib/block-data";
import { PageStyles } from "@/features/cms/components/page-styles.client";

import { ClientPageRenderer } from "./client-page-renderer";

registerBuilderProviders();

type PublicPageProps = {
  params: Promise<{ slug?: string[] | undefined }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const org = await servedOrganization();
  if (!org) return {};

  const { slug: slugArray } = await params;
  const slug = slugArray ? slugArray.join("/") : "";

  const page = await withTenant(org.id, async (tx) => {
    if (!slug) return getHomePage(tx, org.id);
    return getPageBySlug(tx, org.id, slug);
  });

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

export default async function PublicPage({ params }: PublicPageProps) {
  const org = await servedOrganization();
  if (!org) notFound();

  const { slug: slugArray } = await params;
  const slug = slugArray ? slugArray.join("/") : "";
  const isHome = !slugArray || slugArray.length === 0;

  const page = await withTenant(org.id, async (tx) => {
    if (isHome) return getHomePage(tx, org.id);
    return getPageBySlug(tx, org.id, slug);
  });

  if (!page || page.status !== "published") notFound();

  const pageCss = await getBlocksCss(page.blocks);
  const global = await loadGlobalData();

  // Fetch page-type-specific data (e.g., blog post for "blog" pages)
  let externalData: Record<string, unknown> = { global };
  if (page.pageType === "blog") {
    const post = await withTenant(org.id, (tx) => getBlogPostBySlug(tx, org.id, slug));
    if (post) {
      const preview = await withTenant(org.id, (tx) => getBlogPostPreviewForPost(tx, post));
      externalData = { global, blog: preview };
    }
  }

  const pageProps: ChaiPageProps = {
    slug: slug || "/",
    pageType: page.pageType,
    fallbackLang: "en",
    pageLang: "en",
  };

  return (
    <ThemeInjector organizationId={org.id}>
      <PageStyles css={pageCss} />
      <ClientPageRenderer blocks={page.blocks} pageProps={pageProps} externalData={externalData} />
    </ThemeInjector>
  );
}
