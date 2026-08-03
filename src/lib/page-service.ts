import { and, eq, ne, notInArray } from "drizzle-orm";

import { page } from "@/lib/db/schema/pages";
import { listCollectionContentPageTypes } from "@/lib/cms-collection-data";
import type { TenantDb } from "@/lib/db/tenant";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

export async function getPageBySlug(tx: TenantDb, organizationId: string, slug: string) {
  const collectionPageTypes = await listCollectionContentPageTypes(tx, organizationId);
  const conds = [
    eq(page.organizationId, organizationId),
    eq(page.slug, slug),
    ne(page.status, "archived"),
  ];
  if (collectionPageTypes.length > 0) {
    conds.push(notInArray(page.pageType, collectionPageTypes));
  }
  const [row] = await tx.select().from(page).where(and(...conds)).limit(1);
  return row ?? null;
}

export async function getHomePage(tx: TenantDb, organizationId: string) {
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, organizationId),
        eq(page.isHome, true),
        ne(page.status, "archived"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getBlogIndexPage(tx: TenantDb, organizationId: string) {
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, organizationId),
        eq(page.pageType, "blog_index"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Default layout blocks for a freshly lazy-created blog index page (F5.4):
 * a post card grid + pagination, matching the previous hardcoded `<BlogList />`.
 */
export const DEFAULT_BLOG_INDEX_BLOCKS: ChaiBlock[] = [
  {
    _type: "BlogPostList",
    _id: "blog-post-list-default",
    columns: "3",
    showImage: true,
    showExcerpt: true,
    showDate: true,
  },
  {
    _type: "BlogPagination",
    _id: "blog-pagination-default",
    itemsPerPage: 6,
  },
];

/**
 * Lazy-create the tenant's blog index page (`pageType: "blog_index"`, slug
 * "blog") if it does not exist yet. Called from the public blog route so
 * existing orgs get an editable listing without a data migration.
 */
export async function createDefaultBlogIndexPage(
  tx: TenantDb,
  organizationId: string,
  createdByUserId?: string | null,
) {
  const existing = await getBlogIndexPage(tx, organizationId);
  if (existing) return existing;
  const [row] = await tx
    .insert(page)
    .values({
      organizationId,
      slug: "blog",
      title: "Blog",
      pageType: "blog_index",
      blocks: DEFAULT_BLOG_INDEX_BLOCKS,
      status: "published",
      isHome: false,
      createdByUserId: createdByUserId ?? null,
      publishedAt: new Date(),
    })
    .returning();
  return row ?? null;
}
