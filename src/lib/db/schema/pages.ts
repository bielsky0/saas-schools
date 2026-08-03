import { boolean, index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

import type { TemplateConfig } from "./cms-collections";

/**
 * Structured CMS content of a collection entry (blog-templates-cms F5). Stored
 * in `page.pageContent` and kept separate from the layout blocks so a template
 * switch rebuilds the layout without losing the author's content. `tags` and
 * `categories` are flat string arrays (chips in the post settings panel).
 */
export type PageContent = {
  title?: string;
  body?: string;
  excerpt?: string;
  image?: string;
  tags?: string[];
  categories?: string[];
};

/** Empty content shape used to seed new posts / posts without content yet. */
export const EMPTY_PAGE_CONTENT: PageContent = {
  title: "",
  body: "",
  excerpt: "",
  image: "",
  tags: [],
  categories: [],
};

import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Page — a CMS page belonging to an organization (langlion CMS spec, Faza 38).
 *
 * Tenant-isolated via `organizationId`; access gated by the `app.organization_id`
 * GUC (RLS policies in migration 0069). `blocks` holds the ChaiBuilder JSON
 * payload; `seo` carries optional meta tags. Status is a text enum ("draft" |
 * "published" | "archived") — no pgEnum, matching the repo convention.
 *
 * `isHome` marks the org's landing page. Enforced at the application layer
 * (not a partial unique index) for now — the constraint can be added in a
 * later migration if hot-path updates show race conditions.
 *
 * Soft-delete via `status = 'archived'` rather than a `deletedAt` column,
 * because the ChaiBuilder SDK expects a status field and mutating it to
 * "archived" is the delete action it natively sends.
 */
export const page = pgTable(
  "page",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    blocks: jsonb("blocks").$type<ChaiBlock[]>().notNull().default([]),
    seo: jsonb("seo").$type<{
      title?: string;
      description?: string;
      ogImage?: string;
      noIndex?: boolean;
    }>(),
    status: text("status")
      .$type<"draft" | "published" | "archived">()
      .notNull()
      .default("draft"),
    pageType: text("pageType").notNull().default("page"),
    /**
     * Links a collection entry (blog_post / course_entry) to its layout template.
     * Stores the CMS template KEY from src/lib/cms-collections.ts
     * (e.g. "tpl-blog-classic"), NOT a page id — see migration 0076. Nullable:
     * existing pages and unassigned entries have no template.
     */
    templateId: text("templateId"),
    /**
     * Layout config for template pages (pageType = *_template):
     * { layout, elements, dataMapping, seoDefaults }. Null for regular pages.
     */
    templateConfig: jsonb("templateConfig").$type<TemplateConfig>(),
    /**
     * Structured CMS content of a collection entry (blog_post / course_entry):
     * { title, body, excerpt, image, tags, categories } — see PageContent type.
     * Separate from `blocks` (layout inherited from the template), so template
     * switching never touches the content (blog-templates-cms F5).
     */
    pageContent: jsonb("pageContent").$type<PageContent>(),
    parentId: text("parentId").references((): any => page.id, {
      onDelete: "set null",
    }),
    isHome: boolean("isHome").notNull().default(false),
    createdByUserId: text("createdByUserId").references(() => user.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    publishedAt: timestamp("publishedAt"),
    publishedByUserId: text("publishedByUserId").references(() => user.id),
  },
  (t) => ({
    uniqueOrgSlug: unique("page_org_slug_uq").on(t.organizationId, t.slug),
    orgSlugIdx: index("page_org_slug_idx").on(t.organizationId, t.slug),
    statusIdx: index("page_status_idx").on(t.status),
    templateIdIdx: index("page_template_id_idx").on(t.templateId),
  }),
);
