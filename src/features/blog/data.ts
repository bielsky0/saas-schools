import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";

import { getBlogPageType } from "@/lib/cms-collection-data";
import type { TenantDb } from "@/lib/db/tenant";
import { page } from "@/lib/db/schema/pages";
import { user } from "@/lib/db/schema";
import { slugify, resolveUniqueSlug } from "@/features/organizations/slug";

export type BlogPostSeo = {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  image?: string;
  tags?: string[];
  categories?: string[];
  seo?: BlogPostSeo;
  status?: "draft" | "published";
  templateId?: string | null;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  pageContent: typeof page.$inferSelect["pageContent"];
  seo: typeof page.$inferSelect["seo"];
  blocks: typeof page.$inferSelect["blocks"];
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  authorName: string | null;
  authorEmail: string | null;
};

async function blogPageType(tx: TenantDb, orgId: string): Promise<string> {
  return getBlogPageType(tx, orgId);
}

function toBlogPostRow(row: typeof page.$inferSelect): BlogPostRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    pageContent: row.pageContent ?? null,
    seo: row.seo ?? null,
    blocks: row.blocks,
    templateId: row.templateId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    authorName: null,
    authorEmail: null,
  };
}

/**
 * List blog posts for an organization (dashboard blog, F5.1). Returns rows plus
 * the total matching the same filters so the table can paginate. Joins `user`
 * for the author display name.
 */
export async function listBlogPosts(
  tx: TenantDb,
  orgId: string,
  opts?: { status?: "draft" | "published"; q?: string; limit?: number; offset?: number },
): Promise<{ rows: BlogPostRow[]; total: number }> {
  const pageType = await blogPageType(tx, orgId);
  const conditions = [
    eq(page.organizationId, orgId),
    eq(page.pageType, pageType),
    ne(page.status, "archived"),
  ];
  if (opts?.status) conditions.push(eq(page.status, opts.status));
  if (opts?.q) {
    const pattern = `%${opts.q}%`;
    const match = or(ilike(page.title, pattern), ilike(page.slug, pattern));
    if (match) conditions.push(match);
  }

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const [countRow] = await tx
    .select({ value: count() })
    .from(page)
    .where(and(...conditions));
  const total = countRow?.value ?? 0;

  const rows = await tx
    .select({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      pageContent: page.pageContent,
      seo: page.seo,
      blocks: page.blocks,
      templateId: page.templateId,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      publishedAt: page.publishedAt,
      authorName: user.name,
      authorEmail: user.email,
    })
    .from(page)
    .leftJoin(user, eq(user.id, page.createdByUserId))
    .where(and(...conditions))
    .orderBy(desc(page.updatedAt))
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

export async function getBlogPost(
  tx: TenantDb,
  orgId: string,
  postId: string,
): Promise<BlogPostRow | null> {
  const pageType = await blogPageType(tx, orgId);
  const [row] = await tx
    .select({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      pageContent: page.pageContent,
      seo: page.seo,
      blocks: page.blocks,
      templateId: page.templateId,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      publishedAt: page.publishedAt,
      authorName: user.name,
      authorEmail: user.email,
    })
    .from(page)
    .leftJoin(user, eq(user.id, page.createdByUserId))
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.id, postId),
        eq(page.pageType, pageType),
        ne(page.status, "archived"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Published post by slug, without any `/` prefix — the dashboard stores clean
 * slugs. Used by the public blog reader.
 */
export async function getPublishedBlogPostBySlug(
  tx: TenantDb,
  orgId: string,
  slug: string,
): Promise<BlogPostRow | null> {
  const pageType = await blogPageType(tx, orgId);
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.pageType, pageType),
        eq(page.slug, slug),
        eq(page.status, "published"),
      ),
    )
    .limit(1);
  return row ? toBlogPostRow(row) : null;
}

export async function createBlogPost(
  tx: TenantDb,
  orgId: string,
  input: BlogPostInput & { authorId: string },
): Promise<BlogPostRow> {
  const pageType = await blogPageType(tx, orgId);
  const desiredSlug = input.slug?.trim() || slugify(input.title);
  const slug = await resolveUniqueSlug(desiredSlug, async (s) => {
    const [existing] = await tx
      .select({ id: page.id })
      .from(page)
      .where(and(eq(page.organizationId, orgId), eq(page.slug, s)))
      .limit(1);
    return Boolean(existing);
  });

  const rows = await tx
    .insert(page)
    .values({
      organizationId: orgId,
      slug,
      title: input.title,
      pageType,
      blocks: [],
      pageContent: {
        title: input.title,
        body: input.body ?? "",
        excerpt: input.excerpt ?? "",
        image: input.image ?? "",
        tags: input.tags ?? [],
        categories: input.categories ?? [],
      },
      seo: input.seo ?? null,
      status: input.status ?? "draft",
      templateId: input.templateId ?? null,
      isHome: false,
      createdByUserId: input.authorId,
      publishedAt:
        input.status === "published" ? new Date() : null,
    })
    .returning();
  const created = rows[0];
  if (!created) throw new Error("blog_post_create_failed");
  return toBlogPostRow(created);
}

export async function updateBlogPost(
  tx: TenantDb,
  orgId: string,
  postId: string,
  changes: BlogPostInput,
): Promise<BlogPostRow | null> {
  const pageType = await blogPageType(tx, orgId);
  const [existing] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.id, postId),
        eq(page.pageType, pageType),
        ne(page.status, "archived"),
      ),
    )
    .limit(1);
  if (!existing) return null;

  let slug = existing.slug;
  if (changes.slug && changes.slug.trim() !== existing.slug) {
    slug = await resolveUniqueSlug(changes.slug.trim(), async (s) => {
      const [taken] = await tx
        .select({ id: page.id })
        .from(page)
        .where(
          and(
            eq(page.organizationId, orgId),
            eq(page.slug, s),
            ne(page.id, postId),
          ),
        )
        .limit(1);
      return Boolean(taken);
    });
  }

  const nextContent = {
    title: changes.title,
    body: changes.body ?? existing.pageContent?.body ?? "",
    excerpt: changes.excerpt ?? existing.pageContent?.excerpt ?? "",
    image: changes.image ?? existing.pageContent?.image ?? "",
    tags: changes.tags ?? existing.pageContent?.tags ?? [],
    categories: changes.categories ?? existing.pageContent?.categories ?? [],
  };

  const nextStatus = changes.status ?? existing.status;
  const publishedAt =
    nextStatus === "published" && !existing.publishedAt
      ? new Date()
      : nextStatus === "draft"
        ? null
        : existing.publishedAt;

  const rows = await tx
    .update(page)
    .set({
      title: changes.title,
      slug,
      pageContent: nextContent,
      seo: changes.seo ?? existing.seo,
      status: nextStatus,
      templateId: changes.templateId !== undefined ? changes.templateId : existing.templateId,
      updatedAt: new Date(),
      publishedAt,
    })
    .where(eq(page.id, existing.id))
    .returning();
  const updated = rows[0];
  if (!updated) return null;
  return toBlogPostRow(updated);
}

/** Soft delete via status = archived, matching the page model convention. */
export async function deleteBlogPost(
  tx: TenantDb,
  orgId: string,
  postId: string,
): Promise<boolean> {
  const pageType = await blogPageType(tx, orgId);
  const rows = await tx
    .update(page)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.id, postId),
        eq(page.pageType, pageType),
        ne(page.status, "archived"),
      ),
    )
    .returning({ id: page.id });
  return Boolean(rows[0]);
}
