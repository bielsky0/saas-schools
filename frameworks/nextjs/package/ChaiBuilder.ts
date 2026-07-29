import { applyChaiDataBinding } from "@chaibuilder/sdk/render";
import { getChaiPageTypes } from "@chaibuilder/sdk/runtime";
import type { ChaiBlock, ChaiPage, ChaiPageProps, ChaiPageType, ChaiWebsiteSetting } from "@chaibuilder/sdk/types";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import * as utils from "./lib";
import { GetFullPageOptions } from "./lib/get-full-page";
import { ChaiFullPage, ChaiPartialPage } from "./types";

class ChaiBuilder {
  private static appId?: string;
  private static draftMode: boolean = false;
  private static fallbackLang: string = "en";

  static verifyInit() {}

  static init = async (appId: string, draftMode: boolean = false) => {
    if (!appId) {
      throw new Error("Please initialize ChaiBuilder with an API key");
    }
    ChaiBuilder.appId = appId;
    ChaiBuilder.setDraftMode(draftMode);
    await ChaiBuilder.loadSiteSettings(draftMode);
  };

  static getAppId() {
    return ChaiBuilder.appId;
  }

  static setAppId(appId: string) {
    ChaiBuilder.appId = appId;
  }

  static async loadSiteSettings(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    const siteSettings = await ChaiBuilder.getSiteSettings();

    ChaiBuilder.setFallbackLang(siteSettings?.fallbackLang || "en");
  }

  static setDraftMode(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    ChaiBuilder.draftMode = draftMode;
  }

  static setFallbackLang(lang: string) {
    ChaiBuilder.verifyInit();
    ChaiBuilder.fallbackLang = lang;
  }

  static getFallbackLang() {
    ChaiBuilder.verifyInit();
    return ChaiBuilder.fallbackLang;
  }

  static async getSiteSettings(): Promise<ChaiWebsiteSetting> {
    ChaiBuilder.verifyInit();
    return await unstable_cache(
      async () => await utils.getSiteSettings(ChaiBuilder.appId!, ChaiBuilder.draftMode),
      [`website-settings-${ChaiBuilder.getAppId()}`],
      { tags: [`website-settings`, `website-settings-${ChaiBuilder.getAppId()}`] },
    )();
  }

  static async getPageBySlug(slug: string): Promise<ChaiPartialPage> {
    ChaiBuilder.verifyInit();
    try {
      const pageTypes = getChaiPageTypes();
      const dynamicSegments = pageTypes.reduce(
        (acc: Record<string, string>, pageType: ChaiPageType) => {
          if (pageType.dynamicSegments) {
            acc[pageType.key] = pageType.dynamicSegments;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      return await utils.getPageBySlug(slug, this.appId!, this.draftMode, dynamicSegments);
    } catch (error) {
      if (error instanceof Error && error.message === "PAGE_NOT_FOUND") {
        throw notFound();
      }
      throw error;
    }
  }

  static async getFullPage(pageId: string, options?: Partial<GetFullPageOptions>): Promise<ChaiFullPage> {
    ChaiBuilder.verifyInit();
    return await utils.getFullPage(pageId, this.appId!, this.draftMode, options);
  }

  static async getPartialPageBySlug(
    slug: string,
  ): Promise<
    Pick<
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
    >
  > {
    ChaiBuilder.verifyInit();
    // if the slug is of format /_partial/{langcode}/{uuid}, get the uuid. langcode is optional
    const uuid = slug.split("/").pop();
    if (!uuid) {
      throw new Error("PAGE_NOT_FOUND");
    }

    // Fetch the partial page data
    const siteSettings = await ChaiBuilder.getSiteSettings();
    const data = await ChaiBuilder.getFullPage(uuid);
    const lang = slug.split("/").length > 3 ? slug.split("/")[2] : siteSettings?.fallbackLang;
    return { ...data, lang };
  }

  static getPage = cache(async (slug: string): Promise<ChaiFullPage> => {
    ChaiBuilder.verifyInit();
    if (slug.startsWith("/_partial/")) {
      return await ChaiBuilder.getPartialPageBySlug(slug);
    }
    const page = await ChaiBuilder.getPageBySlug(slug);
    const siteSettings = await ChaiBuilder.getSiteSettings();
    const tagPageId = page.id;
    const languagePageId = page.languagePageId || page.id;
    return await unstable_cache(
      async () => {
        const data = await ChaiBuilder.getFullPage(languagePageId, { mergePartials: true });
        const fallbackLang = siteSettings?.fallbackLang;
        return { ...data, fallbackLang, lang: page.lang || fallbackLang };
      },
      ["page-" + languagePageId, page.lang, page.id, slug],
      { tags: ["page-" + tagPageId] },
    )();
  });

  static async getPageSeoData(slug: string) {
    ChaiBuilder.verifyInit();
    if (slug.startsWith("/_partial/")) {
      return {
        title: "Partial Page",
        description: "This is a partial page.",
        robots: {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
      };
    }
    const page = await ChaiBuilder.getPage(slug);
    if ("error" in page && page.error === "PAGE_NOT_FOUND") {
      throw notFound();
    }

    // Type assertion after error check
    const pageData = page as ChaiPage;

    const externalData = await ChaiBuilder.getPageExternalData({
      blocks: pageData.blocks,
      pageProps: pageData,
      pageType: pageData.pageType,
      lang: pageData.lang,
    });

    //@ts-ignore
    const seo = applyChaiDataBinding(pageData?.seo ?? {}, externalData);

    return {
      title: seo?.title,
      description: seo?.description,
      openGraph: {
        title: seo?.ogTitle || seo?.title,
        description: seo?.ogDescription || seo?.description,
        images: seo?.ogImage ? [seo?.ogImage] : [],
      },
      alternates: {
        canonical: seo?.canonicalUrl || "",
      },
      robots: {
        index: !seo?.noIndex,
        follow: !seo?.noFollow,
        googleBot: {
          index: !seo?.noIndex,
          follow: !seo?.noFollow,
        },
      },
    };
  }

  static async getPageExternalData(args: {
    blocks: ChaiBlock[];
    pageProps: ChaiPageProps;
    pageType: string;
    lang: string;
  }) {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.getPageData(args);
  }

  static async getPageStyles(blocks: ChaiBlock[]) {
    ChaiBuilder.verifyInit();
    return await utils.getPageStyles(blocks);
  }

  static resolvePageLink = cache(async (href: string, lang: string): Promise<string> => {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.resolveLink(href, lang);
  });

  static async getPageData(args: {
    blocks: ChaiBlock[];
    pageProps: ChaiPageProps;
    pageType: string;
    lang: string;
  }): Promise<Record<string, unknown>> {
    return await utils.getPageData({ ...args, draftMode: this.draftMode });
  }

  static async getBlocksStyles(blocks: ChaiBlock[]): Promise<string> {
    return await utils.getBlocksStyles(blocks);
  }

  static async resolveLink(href: string, lang: string): Promise<string> {
    return await utils.resolveLink(href, lang, this.appId!, this.draftMode, this.fallbackLang);
  }
}

export { ChaiBuilder };
