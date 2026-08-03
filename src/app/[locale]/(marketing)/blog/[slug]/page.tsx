import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";

import { Badge } from "@/components/ui";
import { authorFor } from "@/features/content/authors";
import { JsonLd } from "@/features/content/components/json-ld";
import { mdxElements } from "@/features/content/components/mdx-elements";
import { Prose } from "@/features/content/components/prose";
import { formatContentDate } from "@/features/content/format";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/features/content/jsonld";
import { pageMetadata } from "@/features/content/seo";
import { CONTENT_LOCALE, getBlogPost, listBlogPosts } from "@/features/content/source";

import { servedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { getBlogPostBySlug, enrichBlocksWithData } from "@/lib/block-data";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";
import { PageStyles } from "@/features/cms/components/page-styles.client";
import { getBlocksCss } from "@/features/cms/get-blocks-css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return listBlogPosts().map((post) => ({ slug: post.slug }));
}

function publishedPost(slug: string) {
  const entry = getBlogPost(slug);
  return entry && entry.meta.status === "published" ? entry : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const org = await servedOrganization();
  const { slug } = await params;

  if (org) {
    const post = await withTenant(org.id, (tx) =>
      getBlogPostBySlug(tx, org.id, slug),
    );
    if (!post) return {};
    const content = post.pageContent ?? {};
    const seo = (post.seo ?? {}) as {
      title?: string;
      description?: string;
      ogImage?: string;
      noIndex?: boolean;
    };
    return {
      title: seo.title ?? content.title ?? post.title,
      description: seo.description ?? content.excerpt,
      ...(seo.noIndex ? { robots: { index: false } as const } : {}),
      openGraph: seo.ogImage || content.image
        ? { images: [(seo.ogImage ?? content.image)!] }
        : undefined,
    };
  }

  const entry = publishedPost(slug);
  if (!entry) return {};

  const { meta } = entry;
  return pageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/blog/${slug}`,
    locale: await getLocale(),
    contentLocale: CONTENT_LOCALE,
    type: "article",
    image: meta.coverImage ?? `/blog/${slug}/opengraph-image`,
    publishedTime: meta.publishedAt,
    modifiedTime: meta.updatedAt ?? meta.publishedAt,
    authors: [authorFor(meta.author).name],
    tags: meta.tags,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const org = await servedOrganization();
  const { slug } = await params;

  if (org) {
    const t = await getTranslations("blog");
    const post = await withTenant(org.id, (tx) =>
      getBlogPostBySlug(tx, org.id, slug),
    );
    if (!post || post.status !== "published") notFound();

    const content = post.pageContent ?? {};

    // New-architecture posts carry their content in `pageContent` (dashboard
    // blog, F5.1) — render the HTML body directly. Legacy posts have layout
    // blocks in `post.blocks`; render those through the tenant page renderer.
    if (content.title || content.body) {
      const title = content.title ?? post.title;
      const tags = content.tags ?? [];
      return (
        <ThemeInjector organizationId={org.id}>
          <article className="mx-auto w-full max-w-3xl px-4 py-16">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground text-sm">
              ← {t("backToBlog")}
            </Link>
            {content.image && (
              <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <header className="mt-8 mb-8 flex flex-col gap-4">
              <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {title}
              </h1>
              {content.excerpt && (
                <p className="text-muted-foreground text-lg text-balance">
                  {content.excerpt}
                </p>
              )}
              {post.publishedAt && (
                <time
                  dateTime={post.publishedAt.toISOString()}
                  className="text-muted-foreground text-sm"
                >
                  {formatContentDate(post.publishedAt.toISOString(), await getLocale())}
                </time>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="normal-case">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>
            {/* TipTap/HTML body — trusted admin content. */}
            <div
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content.body ?? "" }}
            />
          </article>
        </ThemeInjector>
      );
    }

    const enrichedBlocks = await withTenant(org.id, (tx) =>
      enrichBlocksWithData(tx, org.id, post.blocks),
    );
    const pageCss = await getBlocksCss(post.blocks);

    return (
      <ThemeInjector organizationId={org.id}>
        <PageStyles css={pageCss} />
        <TenantPageRenderer
          blocks={enrichedBlocks}
          slug={post.slug}
          pageType={post.pageType}
        />
      </ThemeInjector>
    );
  }

  const locale = await getLocale();
  const entry = publishedPost(slug);
  if (!entry) notFound();

  const { meta } = entry;
  const { default: Body } = await entry.load();
  const author = authorFor(meta.author);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16">
      <JsonLd
        data={[
          blogPostingJsonLd(slug, meta),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: meta.title, path: `/blog/${slug}` },
          ]),
        ]}
      />

      <header className="mb-10 flex flex-col gap-4">
        <Link href="/blog" className="text-muted-foreground hover:text-foreground text-sm">
          ← Back to blog
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {meta.title}
        </h1>
        <p className="text-muted-foreground text-lg text-balance">{meta.description}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <time dateTime={meta.publishedAt}>{formatContentDate(meta.publishedAt, locale)}</time>
          <span aria-hidden="true">·</span>
          <span>
            {author.name}
            {author.title ? `, ${author.title}` : ""}
          </span>
          {meta.tags.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="normal-case">
                    {tag}
                  </Badge>
                ))}
              </span>
            </>
          ) : null}
        </div>
      </header>

      <Prose>
        <Body components={mdxElements} />
      </Prose>
    </article>
  );
}
