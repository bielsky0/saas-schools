import { getStylesForBlocks } from "@chaibuilder/sdk/render";
import type { ChaiBlock } from "@chaibuilder/sdk/types";
import { filterDuplicateStyles } from "./styles-helper";

export const getPageStyles = async (blocks: ChaiBlock[]) => {
  const styles = await getStylesForBlocks(blocks);
  const minifiedStyles = styles.replace(/\s+/g, " ").trim();
  return await filterDuplicateStyles(minifiedStyles);
};
