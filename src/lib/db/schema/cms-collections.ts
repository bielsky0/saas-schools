import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "./organizations";

/**
 * CMS collection — a tenant-owned set of content pages (blog-templates-cms F2.5).
 *
 * Replaces the hardcoded `CMS_COLLECTIONS` config from src/lib/cms-collections.ts:
 * the static array survives only as the seed for migration 0077 and for new
 * organizations (createOrganization). Tenants manage their own collections from
 * the builder's left panel.
 *
 * Tenant-isolated via `organizationId`, RLS like `page`. `key` is the stable
 * API id (e.g. "blog"), NOT a UUID — backward compatible with the pre-DB SDK.
 * `templates` is a small JSONB array (1–5 variants per collection), no separate
 * table. `pageType` is unique per tenant: one pageType = one collection.
 */

export type CmsTemplateLayout = "single" | "sidebar";

export type CmsTemplate = {
  /** Stable config key, e.g. "tpl-blog-classic" — stored in `page.templateId`. */
  id: string;
  name: string;
  /** The owning collection's `key` (e.g. "blog"), kept for backward compat. */
  collectionId: string;
  layout: CmsTemplateLayout;
};

export type CmsCollection = {
  /** Identifies the collection in the UI/API, e.g. "blog". */
  id: string;
  name: string;
  /** `pageType` of the pages that belong to the collection, e.g. "blog_post". */
  pageType: string;
  /** `pageType` of the layout template pages, e.g. "blog_post_template". */
  templatePageType: string;
  /** Layout template variants. */
  templates: CmsTemplate[];
};

export type TemplateElements = {
  thumbnail?: boolean;
  related?: boolean;
  newsletter?: boolean;
};

export type TemplateDataMapping = { slot: string; field: string }[];

export type TemplateSeoDefaults = {
  titlePattern?: string;
  descriptionPattern?: string;
};

export type TemplateConfig = {
  layout: CmsTemplateLayout;
  elements?: TemplateElements;
  dataMapping?: TemplateDataMapping;
  seoDefaults?: TemplateSeoDefaults;
};

export const cmsCollection = pgTable(
  "cms_collection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    pageType: text("pageType").notNull(),
    templatePageType: text("templatePageType").notNull(),
    templates: jsonb("templates").$type<CmsTemplate[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    orgKeyIdx: uniqueIndex("cms_collection_org_key_idx").on(t.organizationId, t.key),
    orgPageTypeIdx: uniqueIndex("cms_collection_org_page_type_idx").on(t.organizationId, t.pageType),
    orgIdx: index("cms_collection_org_idx").on(t.organizationId),
  }),
);

/** Shape of the seed rows written by migration 0077 and createOrganization. */
export type CmsCollectionSeed = {
  key: string;
  name: string;
  pageType: string;
  templatePageType: string;
  templates: CmsTemplate[];
  position: number;
};

/**
 * The default collections every new organization gets (F2.5). Mirrors the seed
 * in migration 0077 — keep both in sync. Inserted in createOrganizationAction.
 */
export const DEFAULT_CMS_COLLECTIONS: CmsCollectionSeed[] = [
  {
    key: "blog",
    name: "Wpis na blogu",
    pageType: "blog_post",
    templatePageType: "blog_post_template",
    position: 0,
    templates: [
      { id: "tpl-blog-classic", name: "Klasyczny Artykuł", collectionId: "blog", layout: "single" },
      { id: "tpl-blog-interview", name: "Wywiad / Case Study", collectionId: "blog", layout: "sidebar" },
    ],
  },
  {
    key: "courses",
    name: "Kursy / Nauczyciele",
    pageType: "course_entry",
    templatePageType: "course_template",
    position: 1,
    templates: [
      { id: "tpl-course-default", name: "Domyślny", collectionId: "courses", layout: "single" },
    ],
  },
  {
    key: "enrollments",
    name: "Zapis na zajęcia",
    pageType: "enrollment_detail",
    templatePageType: "enrollment_template",
    position: 2,
    templates: [
      {
        id: "tpl-enrollment-default",
        name: "Domyślny",
        collectionId: "enrollments",
        layout: "single",
      },
    ],
  },
];
