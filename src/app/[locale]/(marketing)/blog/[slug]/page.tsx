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

  // Apex-only page. Tenant `/blog/{slug}` is rewritten to the CMS blog-post
  // route by src/proxy.ts BEFORE route resolution, so a request should never
  // reach this page with an academy served — but if it ever does, refuse
  // rather than serve the platform's marketing post into a tenant context.
  if (org) {
    return notFound();
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

  // Apex-only page — see generateMetadata above.
  if (org) {
    return notFound();
  }

  const locale = await getLocale();
  const t = await getTranslations("blog");
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
          ← {t("backToBlog")}
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
