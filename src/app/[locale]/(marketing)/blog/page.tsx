import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { JsonLd } from "@/features/content/components/json-ld";
import { PostCard } from "@/features/content/components/post-card";
import { breadcrumbJsonLd } from "@/features/content/jsonld";
import { pageMetadata } from "@/features/content/seo";
import { listBlogPosts } from "@/features/content/source";
import { absoluteUrl, site } from "@/lib/site";

import { servedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { getBlogPosts, getBlogPostsCount, enrichBlocksWithData } from "@/lib/block-data";
import { getBlogIndexPage, createDefaultBlogIndexPage } from "@/lib/page-service";
import { BlogList } from "@/features/cms/components/blog-list";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { TenantPageRenderer } from "@/features/cms/tenant-page-renderer.client";
import { PageStyles } from "@/features/cms/components/page-styles.client";
import { getBlocksCss } from "@/features/cms/get-blocks-css";

type BlogIndexProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const org = await servedOrganization();
  if (org) {
    const blogIndex = await withTenant(org.id, (tx) => getBlogIndexPage(tx, org.id));
    const seo = (blogIndex?.seo ?? {}) as {
      title?: string;
      description?: string;
      ogImage?: string;
      noIndex?: boolean;
    };
    return {
      title: seo.title ?? "Blog",
      description: seo.description,
      ...(seo.noIndex ? { robots: { index: false } as const } : {}),
      openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
    };
  }

  return pageMetadata({
    title: "Blog",
    description: `Product updates, engineering notes and architecture decisions from the ${site.name} team.`,
    path: "/blog",
    locale: await getLocale(),
  });
}

export default async function BlogIndexPage({ searchParams }: BlogIndexProps) {
  const org = await servedOrganization();

  if (org) {
    const { page: pageParam } = await searchParams;
    const rawPage = Array.isArray(pageParam) ? pageParam[0] : pageParam;
    const currentPage = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

    const { blogIndexPage, posts, enrichedBlocks } = await withTenant(
      org.id,
      async (tx) => {
        const blogIndexPage =
          (await getBlogIndexPage(tx, org.id)) ??
          (await createDefaultBlogIndexPage(tx, org.id));

        if (!blogIndexPage) {
          return { blogIndexPage, posts: [], enrichedBlocks: [] };
        }

        const itemsPerPage =
          (blogIndexPage.blocks.find(
            (b) => b._type === "BlogPagination",
          )?.itemsPerPage as number | undefined) ?? 6;
        const offset = (currentPage - 1) * itemsPerPage;

        const posts = await getBlogPosts(tx, org.id, itemsPerPage, offset);
        const total = await getBlogPostsCount(tx, org.id);

        const blocks = (await enrichBlocksWithData(tx, org.id, blogIndexPage.blocks)).map(
          (block) => {
            if (block._type === "BlogPostList") {
              return {
                ...block,
                data: {
                  posts: posts.map((p) => ({
                    id: p.id,
                    title: p.pageContent?.title ?? p.title,
                    slug: p.slug,
                    excerpt: p.pageContent?.excerpt ?? "",
                    image: p.pageContent?.image ?? null,
                    author: null,
                    datePublished: p.publishedAt?.toISOString() ?? null,
                    tags: p.pageContent?.tags ?? [],
                  })),
                },
              };
            }
            if (block._type === "BlogPagination") {
              return {
                ...block,
                data: { total, page: currentPage, itemsPerPage },
              };
            }
            return block;
          },
        );

        return { blogIndexPage, posts, enrichedBlocks: blocks };
      },
    );

    if (!blogIndexPage) {
      return (
        <ThemeInjector organizationId={org.id}>
          <BlogList posts={posts} />
        </ThemeInjector>
      );
    }

    const pageCss = await getBlocksCss(enrichedBlocks);

    return (
      <ThemeInjector organizationId={org.id}>
        <PageStyles css={pageCss} />
        <TenantPageRenderer
          blocks={enrichedBlocks}
          slug="blog"
          pageType="blog_index"
        />
      </ThemeInjector>
    );
  }

  const posts = listBlogPosts();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${site.name} Blog`,
            url: absoluteUrl("/blog"),
            blogPost: posts.map((post) => ({
              "@type": "BlogPosting",
              headline: post.meta.title,
              url: absoluteUrl(`/blog/${post.slug}`),
              datePublished: post.meta.publishedAt,
            })),
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />

      <header className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Blog</h1>
        <p className="text-muted-foreground max-w-xl">
          Product updates, engineering notes, and the reasoning behind the architecture.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
