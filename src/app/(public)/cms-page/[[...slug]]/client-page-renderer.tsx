"use client";

import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import { RenderChaiBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { ChaiPageProps } from "@chaibuilder/sdk/types";

loadWebBlocks();

export function ClientPageRenderer({
  blocks,
  pageProps,
}: {
  blocks: ChaiBlock[];
  pageProps: ChaiPageProps;
}) {
  return (
    <RenderChaiBlocks
      blocks={blocks}
      lang="en"
      fallbackLang="en"
      pageProps={pageProps}
    />
  );
}
