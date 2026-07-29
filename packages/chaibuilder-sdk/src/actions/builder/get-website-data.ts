import { z } from "zod";
import { ChaiBaseAction } from "./base-action";
import { GetCollectionsAction } from "./get-collections";
import { GetLibrariesAction } from "./get-libraries";
import { GetPageTypesAction } from "./get-page-types";
import { GetWebsitePagesAction } from "./get-website-pages";
import { GetWebsiteSettingsAction } from "./get-website-settings";

type GetWebsiteDataActionData = Record<string, never>;

type GetWebsiteDataActionResponse = {
  websiteSettings: any;
  websitePages: any;
  pageTypes: any;
  libraries: any;
  collections: any;
};

export class GetWebsiteDataAction extends ChaiBaseAction<GetWebsiteDataActionData, GetWebsiteDataActionResponse> {
  protected getValidationSchema() {
    return z.object({}).optional().default({});
  }

  async execute(): Promise<GetWebsiteDataActionResponse> {
    const websiteSettingsAction = new GetWebsiteSettingsAction();
    const websitePagesAction = new GetWebsitePagesAction();
    const pageTypesAction = new GetPageTypesAction();
    const librariesAction = new GetLibrariesAction();
    const collectionsAction = new GetCollectionsAction();

    // Set context on all sub-actions
    if (this.context) {
      websiteSettingsAction.setContext(this.context);
      websitePagesAction.setContext(this.context);
      pageTypesAction.setContext(this.context);
      librariesAction.setContext(this.context);
      collectionsAction.setContext(this.context);
    }

    // Execute remaining actions in parallel
    // NOTE: websitePagesAction fetches only primary pages (lang = "")
    const [websiteSettings, websitePages, pageTypes, libraries, collections] = await Promise.all([
      websiteSettingsAction.execute({ draft: true }),
      websitePagesAction.execute({ lang: "" }),
      pageTypesAction.execute(),
      librariesAction.execute(),
      collectionsAction.execute(),
    ]);

    return {
      websiteSettings,
      websitePages,
      pageTypes,
      libraries,
      collections,
    };
  }
}
