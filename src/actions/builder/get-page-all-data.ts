import { z } from "zod";
import { ChaiBaseAction } from "./base-action";
import { GetBuilderPageDataAction } from "./get-builder-page-data";
import { GetDraftPageAction } from "./get-draft-page";
import { GetLanguagePagesAction } from "./get-language-pages";

type GetPageAllDataActionData = {
  id: string;
  lang: string;
  pageType?: string;
  pageProps?: any;
};

type GetPageAllDataActionResponse = {
  draftPage: any;
  builderPageData: any;
  languagePages: any[];
};

/**
 * Get Page All Data Action
 * Consolidates GET_DRAFT_PAGE, GET_BUILDER_PAGE_DATA, and GET_LANGUAGE_PAGES into a single API call
 * This reduces the number of HTTP requests and improves page load performance
 */
export class GetPageAllDataAction extends ChaiBaseAction<GetPageAllDataActionData, GetPageAllDataActionResponse> {
  protected getValidationSchema() {
    return z.object({
      id: z.string(),
      lang: z.string(),
      pageType: z.string().optional(),
      pageProps: z.any().optional().default({}),
    });
  }

  async execute(data: GetPageAllDataActionData): Promise<GetPageAllDataActionResponse> {
    const { id, lang, pageType, pageProps = {} } = data;

    // Initialize sub-actions
    const draftPageAction = new GetDraftPageAction();
    const builderPageDataAction = new GetBuilderPageDataAction();
    const languagePagesAction = new GetLanguagePagesAction();

    // Set context on all sub-actions
    if (this.context) {
      draftPageAction.setContext(this.context);
      builderPageDataAction.setContext(this.context);
      languagePagesAction.setContext(this.context);
    }

    try {
      // Execute all actions in parallel for optimal performance
      const [draftPage, builderPageData, languagePages] = await Promise.all([
        draftPageAction.execute({ id }),
        builderPageDataAction.execute({ lang, pageType, pageProps }),
        languagePagesAction.execute({ id }),
      ]);

      return {
        draftPage,
        builderPageData,
        languagePages,
      };
    } catch (error) {
      // Re-throw with more context about which action failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch page data: ${errorMessage}`);
    }
  }
}
