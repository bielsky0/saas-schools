import { z } from "zod";
import { getChaiGlobalData } from "~/runtime/register-global-data-provider";
import { getChaiPageType } from "~/runtime/register-page-type";
import { ChaiPageType } from "~/types/actions";
import { ChaiBaseAction } from "./base-action";

type GetBuilderPageDataActionData = {
  lang: string;
  pageType?: string;
  pageProps?: any;
};

type GetBuilderPageDataActionResponse = {
  global: any;
  [key: string]: any;
};

/**
 * Get Builder Page Data Action
 * Fetches global data and page-specific data for the builder
 */
export class GetBuilderPageDataAction extends ChaiBaseAction<
  GetBuilderPageDataActionData,
  GetBuilderPageDataActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      lang: z.string(),
      pageType: z.string().optional(),
      pageProps: z.any().optional().default({}),
    });
  }

  async execute(data: GetBuilderPageDataActionData): Promise<GetBuilderPageDataActionResponse> {
    try {
      const { lang, pageType: pageTypeKey, pageProps = {} } = data;

      // Get global data
      const globalData = await getChaiGlobalData({
        lang,
        draft: true,
        inBuilder: true,
      });

      // If no pageType specified, return only global data
      if (!pageTypeKey) {
        return { global: globalData };
      }

      const pageType: ChaiPageType | undefined = getChaiPageType(pageTypeKey);
      if (!pageType) {
        return { global: globalData };
      }

      // Get page-specific data if dataProvider exists
      const pageData = pageType.dataProvider
        ? await pageType.dataProvider({
            lang,
            draft: true,
            inBuilder: true,
            pageProps: pageProps as any,
          })
        : {};

      return {
        ...pageData,
        global: globalData,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
