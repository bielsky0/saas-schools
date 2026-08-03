type FilterOptions = {
  id: string;
  name: string;
  description?: string;
};

type SortOptions = {
  id: string;
  name: string;
  description?: string;
};

export type ChaiCollectoin = {
  id: string;
  name: string;
  description?: string;
  filters?: FilterOptions[];
  sorts?: SortOptions[];
};

/**
 * CMS collection view-models returned by the builder API (blog-templates-cms F2).
 * Mirrors the `buildCollections()` response in `src/app/(builder)/editor/api/route.ts`.
 */
export type CmsTemplateVm = {
  id: string;
  name: string;
  layout: string;
};

export type CmsCollectionVm = {
  id: string;
  name: string;
  pageType: string;
  templatePageType: string;
  postCount: number;
  templates: CmsTemplateVm[];
};

/**
 * A single post item in a CMS collection, as returned by the builder API's
 * LIST_COLLECTION_ITEMS action (blog-templates-cms F3).
 */
export type CmsCollectionItemVm = {
  id: string;
  title: string;
  slug: string;
  templateId: string | null;
  templateName: string | null;
  status: "draft" | "published" | "archived";
  createdAt: string;
};

export type CmsTemplateLayout = "single" | "sidebar";

export type TemplateSeoDefaults = {
  titlePattern?: string;
  descriptionPattern?: string;
};

export type TemplateElements = {
  thumbnail?: boolean;
  related?: boolean;
  newsletter?: boolean;
};

/**
 * Template layout config stored on the template page (`page.templateConfig`)
 * and returned by the builder API's GET_TEMPLATE_DATA action (blog-templates-cms F4).
 */
export type TemplateConfig = {
  layout: CmsTemplateLayout;
  elements?: TemplateElements;
  seoDefaults?: TemplateSeoDefaults;
};

/**
 * Response of GET_TEMPLATE_DATA: the lazily-created template page (blocks) + its
 * layout config. `page` is null until the template page exists (UPDATE_TEMPLATE
 * creates it on first save).
 */
export type TemplateDataVm = {
  page: {
    id: string;
    blocks: unknown[];
  } | null;
  config: TemplateConfig;
};

/**
 * Structured CMS content of a collection entry (blog-templates-cms F5). Stored
 * in `page.pageContent`, separate from the layout blocks so a template switch
 * rebuilds the layout without losing the author's content.
 */
export type PostContent = {
  title?: string;
  body?: string;
  excerpt?: string;
  image?: string;
  tags?: string[];
  categories?: string[];
};
