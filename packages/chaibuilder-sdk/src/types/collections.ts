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
