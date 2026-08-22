"use client";

import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import { RenderChaiBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import type { ChaiPageProps } from "@chaibuilder/sdk/types";

loadWebBlocks();

export function ClientPageRenderer({
  blocks,
  pageProps,
  externalData,
}: {
  blocks: ChaiBlock[];
  pageProps: ChaiPageProps;
  externalData?: Record<string, unknown>;
}) {
  return (
    <RenderChaiBlocks
      blocks={blocks}
      lang="en"
      fallbackLang="en"
      pageProps={pageProps}
      externalData={externalData}
    />
  );
}
