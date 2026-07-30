"use client";

import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import { RenderChaiBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { ChaiPageProps } from "@chaibuilder/sdk/types";

import "@/blocks";

loadWebBlocks();

export function TenantPageRenderer({
  blocks,
  slug = "/",
  pageType = "page",
}: {
  blocks: ChaiBlock[];
  slug?: string;
  pageType?: string;
}) {
  const pageProps: ChaiPageProps = {
    slug,
    pageType,
    fallbackLang: "en",
    pageLang: "en",
  };

  return (
    <RenderChaiBlocks
      blocks={blocks}
      lang="en"
      fallbackLang="en"
      pageProps={pageProps}
    />
  );
}
