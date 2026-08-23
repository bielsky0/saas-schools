import { and, desc, eq, isNull } from "drizzle-orm";
import { count } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import { membership, user } from "@/lib/db/schema";
import { page } from "@/lib/db/schema/pages";
import {
  getBlogPageType,
  getCollectionByKey,
  getTemplateOf,
} from "@/lib/cms-collection-data";
import { getGroupType } from "@/features/groups/data";
import { listUpcomingSessions } from "@/features/schedule/data";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { BlogPostPreview } from "@chaibuilder/sdk/runtime";

export type GroupTypeBlockData = {
  name: string;
  description: string | null;
  price: number;
  slug: string;
  status: "scheduled" | "collecting_interest";
  defaultDurationMinutes: number | null;
} | null;

export type UpcomingSessionBlockData = {
  id: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  status: string;
  groupTypeId: string;
  groupTypeName: string;
  trainerName: string | null;
  trainerEmail: string | null;
  locationId: string | null;
  locationName: string | null;
};

export type TrainerBlockData = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
} | null;

export async function getGroupTypeForBlock(
  tx: TenantDb,
  orgId: string,
  groupTypeId: string,
): Promise<GroupTypeBlockData> {
  const gt = await getGroupType(tx, orgId, groupTypeId);
  if (!gt) return null;
  return {
    name: gt.name,
    description: gt.description,
    price: gt.price,
    slug: gt.slug,
    status: gt.status,
    defaultDurationMinutes: gt.defaultDurationMinutes,
  };
}

export async function getUpcomingSessionsForBlock(
  tx: TenantDb,
  orgId: string,
  opts?: { groupTypeId?: string; limit?: number },
): Promise<UpcomingSessionBlockData[]> {
  const limit = opts?.limit ?? 5;
  const sessions = await listUpcomingSessions(tx, orgId, { limit: 200 });
  const filtered = opts?.groupTypeId
    ? sessions.filter((s) => s.groupTypeId === opts.groupTypeId)
    : sessions;
  return filtered.slice(0, limit);
}

export async function getTrainerForBlock(
  tx: TenantDb,
  orgId: string,
  userId: string,
): Promise<TrainerBlockData> {
  const [row] = await tx
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(
      and(
        eq(membership.organizationId, orgId),
        eq(membership.userId, userId),
        eq(membership.role, "trainer"),
        eq(membership.status, "active"),
        isNull(user.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getBlogPosts(
  tx: TenantDb,
  orgId: string,
  limit?: number,
  offset?: number,
) {
  const pageType = await getBlogPageType(tx, orgId);
  return tx.query.page.findMany({
    where: and(
      eq(page.organizationId, orgId),
      eq(page.pageType, pageType),
      eq(page.status, "published"),
    ),
    orderBy: [desc(page.publishedAt)],
    limit: limit ?? 10,
    offset: offset ?? 0,
  });
}

export async function getBlogPostsCount(tx: TenantDb, orgId: string) {
  const pageType = await getBlogPageType(tx, orgId);
  const [row] = await tx
    .select({ value: count() })
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.pageType, pageType),
        eq(page.status, "published"),
      ),
    );
  return row?.value ?? 0;
}

export async function getBlogPostBySlug(
  tx: TenantDb,
  orgId: string,
  slug: string,
) {
  const pageType = await getBlogPageType(tx, orgId);
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.slug, slug),
        eq(page.pageType, pageType),
        eq(page.status, "published"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Map a blog post row into the SDK `BlogPostPreview` shape (F5.5 dynamic
 * sources). Mirrors the builder API's `GET_BLOG_POST_PREVIEW` mapping so the
 * public renderer resolves `{{blog.*}}` bindings with the same field set.
 */
export function toBlogPostPreview(
  row: typeof page.$inferSelect,
  authorName = "",
): BlogPostPreview {
  const content = row.pageContent ?? {};
  const seo = (row.seo ?? {}) as { description?: string; ogImage?: string };
  return {
    id: row.id,
    title: content.title ?? row.title ?? "",
    body: content.body ?? "",
    excerpt: content.excerpt ?? seo.description ?? "",
    image: content.image ?? seo.ogImage ?? "",
    author: authorName,
    datePublished: row.publishedAt?.toISOString() ?? row.updatedAt?.toISOString() ?? "",
    tags: content.tags ?? [],
    categories: content.categories ?? [],
    slug: row.slug,
  };
}

/**
 * Build the `BlogPostPreview` for a public post page, resolving the author
 * display name from the post's creator.
 */
export async function getBlogPostPreviewForPost(
  tx: TenantDb,
  post: typeof page.$inferSelect,
): Promise<BlogPostPreview> {
  let authorName = "";
  if (post.createdByUserId) {
    const [author] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, post.createdByUserId))
      .limit(1);
    authorName = author?.name ?? "";
  }
  return toBlogPostPreview(post, authorName);
}

/**
 * Resolve a collection layout template page: `(organizationId, pageType =
 * <collection>.templatePageType, slug = <template id>)` — the same identity the
 * builder API uses (GET_TEMPLATE_DATA). Returns `null` when the tenant has not
 * customized the template yet.
 */
export async function getBlogTemplatePage(
  tx: TenantDb,
  orgId: string,
  collectionKey: string,
  templateId: string,
) {
  const collection = await getCollectionByKey(tx, orgId, collectionKey);
  const template = collection ? getTemplateOf(collection, templateId) : null;
  if (!collection || !template) return null;
  const [row] = await tx
    .select()
    .from(page)
    .where(
      and(
        eq(page.organizationId, orgId),
        eq(page.pageType, collection.templatePageType),
        eq(page.slug, template.id),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Dedicated single-post blog blocks — the ones that read `data` (F5.2). */
const BLOG_POST_PREVIEW_BLOCK_TYPES = new Set([
  "BlogPostTitle",
  "BlogPostContent",
  "BlogPostImage",
  "BlogPostAuthor",
  "BlogPostDate",
  "BlogPostExcerpt",
  "BlogPostTags",
]);

/**
 * Enrich template blocks for a blog post page: run the generic enrichment and
 * inject the post preview into the dedicated blog blocks, so they render real
 * content publicly. Generic `{{blog.*}}` bindings resolve via `externalData`
 * passed to `TenantPageRenderer` (F5.5).
 */
export async function enrichBlogPostBlocks(
  tx: TenantDb,
  orgId: string,
  blocks: ChaiBlock[],
  preview: BlogPostPreview,
): Promise<ChaiBlock[]> {
  const enriched = await enrichBlocksWithData(tx, orgId, blocks);
  return enriched.map((block) =>
    BLOG_POST_PREVIEW_BLOCK_TYPES.has(block._type)
      ? { ...block, data: preview }
      : block,
  );
}

export async function enrichBlocksWithData(
  tx: TenantDb,
  orgId: string,
  blocks: ChaiBlock[],
): Promise<ChaiBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      switch (block._type) {
        case "GroupTypeCard": {
          const groupTypeId = block.groupTypeId as string | undefined;
          if (!groupTypeId) break;
          const data = await getGroupTypeForBlock(tx, orgId, groupTypeId);
          return { ...block, data };
        }
        case "UpcomingEvents": {
          const data = await getUpcomingSessionsForBlock(tx, orgId, {
            groupTypeId: block.groupTypeId as string | undefined,
            limit: (block.limit as number | undefined) ?? 5,
          });
          return { ...block, data };
        }
        case "InstructorCard": {
          const trainerId = block.trainerId as string | undefined;
          if (!trainerId) break;
          const data = await getTrainerForBlock(tx, orgId, trainerId);
          return { ...block, data };
        }
        case "BlogPostList": {
          return { ...block, data: { posts: [] } };
        }
      }
      return block;
    }),
  );
}

/**
 * Resolve the blocks that render a blog post publicly. Blog posts are driven
 * exclusively by their layout template (`templateId` → template page blocks);
 * `post.blocks` is only a fallback for posts without an assigned template.
 * This is what makes template switching in the dashboard take effect
 * immediately — the renderer always re-resolves the template.
 */
export async function getEffectiveBlogPostBlocks(
  tx: TenantDb,
  orgId: string,
  post: typeof page.$inferSelect,
): Promise<ChaiBlock[]> {
  if (post.templateId) {
    const collection = await getCollectionByKey(tx, orgId, "blog");
    const template = collection
      ? getTemplateOf(collection, post.templateId)
      : null;
    if (collection && template) {
      const [tplPage] = await tx
        .select({ blocks: page.blocks })
        .from(page)
        .where(
          and(
            eq(page.organizationId, orgId),
            eq(page.pageType, collection.templatePageType),
            eq(page.slug, template.id),
          ),
        )
        .limit(1);
      if (tplPage?.blocks && tplPage.blocks.length > 0) {
        return tplPage.blocks;
      }
    }
  }

  return post.blocks ?? [];
}
