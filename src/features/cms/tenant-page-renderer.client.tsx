"use client";

import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import { RenderChaiBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { ChaiPageProps } from "@chaibuilder/sdk/types";

loadWebBlocks();

export function TenantPageRenderer({
  blocks,
}: {
  blocks: ChaiBlock[];
}) {
  const pageProps: ChaiPageProps = {
    slug: "/",
    pageType: "page",
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
