import { getStylesForBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

export async function getBlocksCss(blocks: ChaiBlock[]): Promise<string> {
  return getStylesForBlocks(blocks, true);
}
