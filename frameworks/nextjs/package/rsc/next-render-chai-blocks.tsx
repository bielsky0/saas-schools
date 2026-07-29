import { applyDesignTokens, RenderChaiBlocks as RenderChaiBlocksSdk } from "@chaibuilder/sdk/render";
import { setChaiBlockComponent } from "@chaibuilder/sdk/runtime";
import { ChaiBlockComponentProps, ChaiDesignTokens, ChaiPageProps, ChaiStyles } from "@chaibuilder/sdk/types";
import { isEmpty } from "lodash";
import { ChaiBuilder } from "../ChaiBuilder";
import { ChaiFullPage } from "../types";
import { ImageBlock } from "./image-block";
import { JSONLD } from "./json-ld";
import { LinkBlock } from "./link-block";
// TODO: Keep this NextJSRenderChaiBlocks implementation functionally aligned with the RSC
// version in render-chai-blocks.tsx:
// https://github.com/chaibuilder/frameworks/blob/main/packages/next/src/blocks/rsc/render-chai-blocks.tsx
// (e.g., sync new props, block registrations, and rendering behavior when that file changes).

type ImageBlockProps = {
  height: string;
  width: string;
  alt: string;
  styles: ChaiStyles;
  lazyLoading: boolean;
  image: string;
};

type LinkBlockProps = {
  styles: ChaiStyles;
  content: string;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    target: "_self" | "_blank";
    href: string;
  };
  prefetchLink?: boolean;
};

export const NextJSRenderChaiBlocks = async ({
  page,
  pageProps,
  linkComponent = LinkBlock,
  imageComponent = ImageBlock,
  designTokens = {},
}: {
  page: ChaiFullPage;
  pageProps: ChaiPageProps;
  designTokens?: ChaiDesignTokens;
  linkComponent?:
    | React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>>;
  imageComponent?:
    | React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>>;
}) => {
  setChaiBlockComponent("Link", await linkComponent);
  setChaiBlockComponent("Image", await imageComponent);
  const pageData = await ChaiBuilder.getPageExternalData({
    blocks: page.blocks,
    pageProps,
    pageType: page.pageType,
    lang: page.lang,
  });
  const settings = await ChaiBuilder.getSiteSettings();
  const tokens = settings?.designTokens ?? designTokens;

  //Register Link and Image blocks with Chai Builder
  return (
    <>
      <JSONLD jsonLD={page?.seo?.jsonLD} pageData={pageData} />
      <RenderChaiBlocksSdk
        externalData={pageData}
        blocks={!isEmpty(tokens) ? applyDesignTokens(page.blocks, tokens as ChaiDesignTokens) : page.blocks}
        fallbackLang={settings?.fallbackLang}
        lang={page.lang}
        pageProps={pageProps}
      />
    </>
  );
};
