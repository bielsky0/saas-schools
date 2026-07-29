import { z } from "zod";
import { getChaiPageType } from "~/runtime/register-page-type";
import { ChaiBaseAction } from "./base-action";

type GetDynamicPagesActionData = {
  pageType: string;
  [key: string]: any;
};

type GetDynamicPagesActionResponse = any[] | { error: string };

/**
 * Get Dynamic Pages Action
 * Retrieves dynamic pages for a specific page type
 */
export class GetDynamicPagesAction extends ChaiBaseAction<GetDynamicPagesActionData, GetDynamicPagesActionResponse> {
  protected getValidationSchema() {
    return z.object({
      pageType: z.string(),
    });
  }

  async execute(data: GetDynamicPagesActionData): Promise<GetDynamicPagesActionResponse> {
    try {
      const { pageType: pageTypeKey, ...restData } = data;

      const pageType = getChaiPageType(pageTypeKey);
      if (!pageType) {
        return { error: "Page type not found" };
      }

      // If the page type has a getDynamicPages function, use it
      if (pageType.getDynamicPages) {
        const result = await pageType.getDynamicPages(restData);
        return result;
      }

      // If no getDynamicPages function, return empty array
      return [];
    } catch (error) {
      return this.handleError(error);
    }
  }
}
