import { isFunction } from "lodash-es";
import { z } from "zod";
import { getRegisteredChaiBlock } from "~/runtime";
import { getChaiCollection } from "~/runtime/register-collection";
import { ChaiBlock } from "~/types/common";
import { ChaiBaseAction } from "./base-action";

type GetBlockAsyncPropsActionData = {
  block: ChaiBlock;
  pageProps: any;
  lang: string;
};

type GetBlockAsyncPropsActionResponse = any[] | Record<string, any>;

/**
 * Get Block Async Props Action
 * Fetches async data for a block, either from collections (for Repeater blocks)
 * or from the block's dataProvider function
 */
export class GetBlockAsyncPropsAction extends ChaiBaseAction<
  GetBlockAsyncPropsActionData,
  GetBlockAsyncPropsActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      block: z.any(),
      pageProps: z.any().optional().default({}),
      lang: z.string(),
    });
  }

  async execute(data: GetBlockAsyncPropsActionData): Promise<GetBlockAsyncPropsActionResponse> {
    try {
      const { block, pageProps, lang } = data;
      const blockType = block._type;

      // Handle Repeater blocks with collection data
      if (blockType === "Repeater" && block?.repeaterItems?.includes("{{#")) {
        const collectionKey = block.repeaterItems.replace("{{#", "").replace("}}", "");
        const collection = getChaiCollection(collectionKey);

        if (!collection) {
          return [];
        }

        const result = await collection?.fetch({
          block,
          pageProps: pageProps as any,
          lang,
          draft: true,
          inBuilder: true,
        });

        return result ?? [];
      }

      // Handle regular blocks with dataProvider
      const blockDef = getRegisteredChaiBlock(blockType);
      if (!blockDef || !isFunction(blockDef.dataProvider)) {
        return {};
      }

      const result = await blockDef.dataProvider({
        block,
        pageProps: pageProps as any,
        lang,
        draft: true,
        inBuilder: true,
      });

      return result ?? {};
    } catch (error) {
      return this.handleError(error);
    }
  }
}
