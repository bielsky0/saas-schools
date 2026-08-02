/**
 * CMS collections — the single source of truth for CMS collections (blog-templates-cms F1).
 *
 * Collections are defined in code, not in a table: a config map from `pageType`
 * to a collection name plus its layout template variants. There is deliberately
 * no collection-management UI — adding a collection means editing this file.
 *
 * A layout template is a PAGE (pageType = collection's `templatePageType`, e.g.
 * `blog_post_template`) whose `page.id` is irrelevant to callers: the stable
 * handle is the `CmsTemplate.id` KEY below (e.g. "tpl-blog-classic"), which the
 * API validates against `CMS_COLLECTIONS` and stores in `page.templateId`.
 * The template page rows themselves are created lazily per-organization.
 *
 * This module is kept free of DB imports so it is trivially unit-testable.
 */

export type CmsTemplateLayout = "single" | "sidebar";

export type CmsTemplate = {
  /** Stable config key, e.g. "tpl-blog-classic" — stored in `page.templateId`. */
  id: string;
  name: string;
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
  /** Layout template variants (static list owned by the app). */
  templates: CmsTemplate[];
};

export const CMS_COLLECTIONS: CmsCollection[] = [
  {
    id: "blog",
    name: "Wpis na blogu",
    pageType: "blog_post",
    templatePageType: "blog_post_template",
    templates: [
      { id: "tpl-blog-classic", name: "Klasyczny Artykuł", collectionId: "blog", layout: "single" },
      { id: "tpl-blog-interview", name: "Wywiad / Case Study", collectionId: "blog", layout: "sidebar" },
    ],
  },
  {
    id: "courses",
    name: "Kursy / Nauczyciele",
    pageType: "course_entry",
    templatePageType: "course_template",
    templates: [
      { id: "tpl-course-default", name: "Domyślny", collectionId: "courses", layout: "single" },
    ],
  },
];

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

/** Fallback config used when a template page has no `templateConfig` yet. */
export function getDefaultTemplateConfig(
  template: Pick<CmsTemplate, "layout">,
): TemplateConfig {
  return {
    layout: template.layout,
    elements: { thumbnail: true, related: true, newsletter: false },
    dataMapping: [],
    seoDefaults: { titlePattern: "{title}", descriptionPattern: "{description}" },
  };
}

export function getCollectionById(id: string | undefined): CmsCollection | undefined {
  if (!id) return undefined;
  return CMS_COLLECTIONS.find((c) => c.id === id);
}

export function getCollectionByPageType(
  pageType: string | undefined,
): CmsCollection | undefined {
  if (!pageType) return undefined;
  return CMS_COLLECTIONS.find(
    (c) => c.pageType === pageType || c.templatePageType === pageType,
  );
}

export function getTemplateById(
  collectionId: string | undefined,
  templateId: string | undefined,
): CmsTemplate | undefined {
  if (!templateId) return undefined;
  return getCollectionById(collectionId)?.templates.find((t) => t.id === templateId);
}

/** `templateId` → human name, or `null` when the entry has no template. */
export function getTemplateName(
  collectionId: string | undefined,
  templateId: string | null | undefined,
): string | null {
  if (!templateId) return null;
  return getTemplateById(collectionId, templateId)?.name ?? null;
}
