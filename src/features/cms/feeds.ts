import { servedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { getBlogPosts, getBlogPostsCount } from "@/lib/block-data";
import { cmsCollection } from "@/lib/db/schema/cms-collections";
import { page } from "@/lib/db/schema/pages";
import { eq, and, ne } from "drizzle-orm";

export type FeedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  image: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  tags: string[];
  categories: string[];
};

export async function getFeedPosts(limit = 50): Promise<FeedPost[]> {
  const org = await servedOrganization();
  if (!org) return [];

  return withTenant(org.id, async (tx) => {
    // Find blog collection
    const [blogColl] = await tx
      .select({ pageType: cmsCollection.pageType })
      .from(cmsCollection)
      .where(
        and(
          eq(cmsCollection.organizationId, org.id),
          eq(cmsCollection.key, "blog"),
        ),
      )
      .limit(1);

    if (!blogColl) return [];

    const posts = await tx
      .select({
        id: page.id,
        slug: page.slug,
        title: page.title,
        pageContent: page.pageContent,
        seo: page.seo,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
      })
      .from(page)
      .where(
        and(
          eq(page.organizationId, org.id),
          eq(page.pageType, blogColl.pageType),
          eq(page.status, "published"),
          ne(page.slug, ""),
        ),
      )
      .orderBy(page.publishedAt)
      .limit(limit);

    return posts.map((p) => {
      const content = (p.pageContent ?? {}) as {
        title?: string;
        body?: string;
        excerpt?: string;
        image?: string;
        tags?: string[];
        categories?: string[];
      };
      const seo = (p.seo ?? {}) as { ogImage?: string; description?: string };

      return {
        id: p.id,
        slug: p.slug,
        title: content.title ?? p.title,
        excerpt: content.excerpt ?? seo.description ?? "",
        body: content.body ?? "",
        image: content.image ?? seo.ogImage ?? null,
        publishedAt: p.publishedAt,
        updatedAt: p.updatedAt,
        tags: content.tags ?? [],
        categories: content.categories ?? [],
      };
    });
  });
}

export async function getSiteName(): Promise<string> {
  const org = await servedOrganization();
  if (!org) return "Blog";
  return org.name;
}
