import type { ChaiPage } from "@chaibuilder/sdk/types";
export * from "@chaibuilder/sdk/types";

export type ChaiPartialPage = {
  id: string;
  languagePageId: string;
  lang: string;
  pageType: string;
  slug: string;
};

export type ChaiFullPage = Pick<
  ChaiPage,
  | "id"
  | "name"
  | "slug"
  | "lang"
  | "primaryPage"
  | "seo"
  | "currentEditor"
  | "pageType"
  | "lastSaved"
  | "dynamic"
  | "parent"
  | "blocks"
>;
