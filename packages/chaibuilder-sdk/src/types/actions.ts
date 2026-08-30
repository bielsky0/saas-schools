import type { StreamTextResult } from "ai";
import type { ChaiBlock, ChaiPageProps } from "~/types/common";
import type { ChaiTheme } from "./chaibuilder-editor-props";
import type { ChaiDesignTokens, ComponentTokens } from "./types";

export type ChaiWebsiteSetting = {
  appKey: string;
  fallbackLang: string;
  languages: string[];
  theme: ChaiTheme;
  settings: Record<string, any>;
  designTokens: ChaiDesignTokens;
  componentTokens?: ComponentTokens;
  appChanges?: string[];
};

type ChaiPageSeo = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  jsonLD?: string;
};

export type ChaiPage = {
  id: string;
  slug: string;
  lang: string;
  name: string;
  pageType: string;
  blocks: ChaiBlock[];
  createdAt: string;
  lastSaved: string;
  dynamic: boolean;
  online: boolean;
  seo: ChaiPageSeo;
  app: string;
  primaryPage?: string | null;
  currentEditor?: string | null;
  changes: object[];
  parent?: string | null;
  libRefId?: string | null;
  dynamicSlugCustom?: string | null;
  metadata?: object;
  jsonld?: object;
  globalJsonLds?: string[];
  links?: string;
  partialBlocks?: string;
  designTokens?: ChaiDesignTokens;
};

export type ChaiPageType = {
  key: string;
  helpText?: string;
  icon?: string;
  hasSlug?: boolean;
  /** System pages are seeded per-tenant (not creatable) and grouped under a
   * dedicated "System pages" group in the left panel and topbar. */
  isSystem?: boolean;
  name: string | (() => Promise<string>);
  dynamicSegments?: string;
  dynamicSlug?: string;
  getDynamicPages?: ({
    query,
    uuid,
  }: {
    query?: string;
    uuid?: string;
  }) => Promise<Pick<ChaiPage, "id" | "name" | "slug" | "primaryPage">[]>;
  search?: (query: string) => Promise<Pick<ChaiPage, "id" | "name" | "slug">[] | Error>;
  resolveLink?: (id: string, draft?: boolean, lang?: string) => Promise<string>;
  onCreate?: (data: Partial<ChaiPage> & { id: string }) => Promise<void>;
  onUpdate?: (data: Partial<ChaiPage> & { id: string }) => Promise<void>;
  onDelete?: (data: Pick<ChaiPage, "id">) => Promise<void>;

  // page data
  dataProvider?: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    pageProps: ChaiPageProps;
  }) => Promise<Record<string, any>>;

  //extra options
  defaultSeo?: () => Record<string, any>;
  defaultJSONLD?: () => Record<string, any>;
  defaultMetaTags?: () => Record<string, string>;
};

export interface ChaiLoggedInUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

export type ChaiUserInfo = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
};

export type ChaiAsset = {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  size?: number;
  folderId: string | null;

  // Optional
  thumbnailUrl?: string;
  description?: string;
  duration?: number;
  format?: string;

  width?: number;
  height?: number;
};

export type AssetsParams = {
  search: string;
  limit: number;
  page: number;
};

export type AIChatOptions = {
  messages: any[];
  image?: string;
  systemPrompt?: string;
  initiator?: string | null;
  model?: string;
  context?: AIContext;
};

export type AIContext = {
  site?: Record<string, any>;
  page?: Record<string, any>;
};

export interface ChaiBuilderPagesAIInterface {
  handleRequest(options: AIChatOptions, res: any): Promise<StreamTextResult<any, any>>;
  isConfigured(): boolean;
}
