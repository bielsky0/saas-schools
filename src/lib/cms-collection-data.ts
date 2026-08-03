/**
 * CMS collection data access (blog-templates-cms F2.5).
 *
 * Replaces the hardcoded CMS_COLLECTIONS config from the deleted
 * src/lib/cms-collections.ts: every lookup is now a tenant-scoped query
 * against the `cms_collection` table. `getDefaultTemplateConfig` and the
 * template helpers are kept here (pure) so callers that already hold a
 * collection row can use them without an extra round-trip.
 */
import { and, eq, or } from "drizzle-orm";

import { cmsCollection, type CmsTemplate, type TemplateConfig } from "@/lib/db/schema/cms-collections";
import type { TenantDb } from "@/lib/db/tenant";

export type CmsCollectionRow = typeof cmsCollection.$inferSelect;

export async function listCollections(tx: TenantDb, organizationId: string): Promise<CmsCollectionRow[]> {
  return tx
    .select()
    .from(cmsCollection)
    .where(eq(cmsCollection.organizationId, organizationId))
    .orderBy(cmsCollection.position);
}

export async function getCollectionByKey(
  tx: TenantDb,
  organizationId: string,
  key: string | undefined,
): Promise<CmsCollectionRow | null> {
  if (!key) return null;
  const [row] = await tx
    .select()
    .from(cmsCollection)
    .where(and(eq(cmsCollection.organizationId, organizationId), eq(cmsCollection.key, key)))
    .limit(1);
  return row ?? null;
}

/**
 * Resolve a collection by a page's `pageType` (either the content pageType or
 * the template pageType). Used to keep collection pages out of the regular
 * page tree and to enrich builder data generically.
 */
export async function getCollectionByPageType(
  tx: TenantDb,
  organizationId: string,
  pageType: string | undefined,
): Promise<CmsCollectionRow | null> {
  if (!pageType) return null;
  const [row] = await tx
    .select()
    .from(cmsCollection)
    .where(
      and(
        eq(cmsCollection.organizationId, organizationId),
        or(
          eq(cmsCollection.pageType, pageType),
          eq(cmsCollection.templatePageType, pageType),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Template lookup against an already-loaded collection row. */
export function getTemplateOf(
  collection: Pick<CmsCollectionRow, "templates"> | null | undefined,
  templateId: string | undefined,
): CmsTemplate | null {
  if (!collection || !templateId) return null;
  return collection.templates.find((t) => t.id === templateId) ?? null;
}

/** `templateId` → human name, or `null` when the entry has no template. */
export function getTemplateNameOf(
  collection: Pick<CmsCollectionRow, "templates"> | null | undefined,
  templateId: string | null | undefined,
): string | null {
  if (!templateId) return null;
  return getTemplateOf(collection, templateId)?.name ?? null;
}

/** Fallback config used when a template page has no `templateConfig` yet. */
export function getDefaultTemplateConfig(
  template: Pick<CmsTemplate, "layout">,
): TemplateConfig {
  return {
    layout: template.layout,
    elements: { thumbnail: true, related: true, newsletter: false },
    // Default slot->field mapping so post content binds to the obvious blocks
    // even before a layout was designed (blog-templates-cms F5).
    dataMapping: [
      { slot: "heading_h1", field: "title" },
      { slot: "featured_image", field: "image" },
      { slot: "body", field: "body" },
    ],
    seoDefaults: { titlePattern: "{title}", descriptionPattern: "{description}" },
  };
}

/**
 * All content `pageType`s owned by collections — pages with these types are
 * collection entries, NOT regular pages, so the generic page-by-slug resolver
 * must exclude them.
 */
export async function listCollectionContentPageTypes(
  tx: TenantDb,
  organizationId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ pageType: cmsCollection.pageType })
    .from(cmsCollection)
    .where(eq(cmsCollection.organizationId, organizationId));
  return rows.map((r) => r.pageType);
}

/**
 * Resolve the "blog" collection's content pageType, falling back to the legacy
 * hardcoded "blog_post" when the collection is missing (defensive — the seed
 * guarantees it). Used by the public blog routes.
 */
export async function getBlogPageType(tx: TenantDb, organizationId: string): Promise<string> {
  const blog = await getCollectionByKey(tx, organizationId, "blog");
  return blog?.pageType ?? "blog_post";
}
