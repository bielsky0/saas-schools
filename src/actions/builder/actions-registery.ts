import { get } from "lodash-es";
import { registerChaiPageType } from "~/runtime/register-page-type";
import { registerChaiPartialType } from "~/runtime/register-partial-type";
import { AskAIAction } from "./ask-ai-action";
import { ChaiAction } from "./chai-action-interface";
import { CheckUserAccessAction } from "./check-user-access";
import { CreatePageAction } from "./create-page";
import { DeleteLibraryItemAction } from "./delete-library-item";
import { DeletePageAction } from "./delete-page";
import { DeletePageRevisionAction } from "./delete-page-revision";
import { DuplicatePageAction } from "./duplicate-page";
import { GenerateHtmlFromPromptAction } from "./generate-html-from-prompt";
import { GenerateSeoFieldAction } from "./generate-seo-field";
import { GetBlockAsyncPropsAction } from "./get-block-async-props";
import { GetBuilderPageDataAction } from "./get-builder-page-data";
import { GetChangesAction } from "./get-changes";
import { GetCollectionsAction } from "./get-collections";
import { GetCompareDataAction } from "./get-compare-data";
import { GetDraftPageAction } from "./get-draft-page";
import { GetDynamicPagesAction } from "./get-dynamic-pages";
import { GetLanguagePagesAction } from "./get-language-pages";
import { GetLibrariesAction } from "./get-libraries";
import { GetLibraryGroupsAction } from "./get-library-groups";
import { GetLibraryItemAction } from "./get-library-item";
import { GetLibraryItemsAction } from "./get-library-items";
import { GetPageAllDataAction } from "./get-page-all-data";
import { GetPageRevisionsAction } from "./get-page-revisions";
import { GetPageTypesAction } from "./get-page-types";
import { GetRevisionPageAction } from "./get-revision-page";
import { GetSiteWideDataAction } from "./get-site-wide-data";
import { GetTemplatesByTypeAction } from "./get-templates-by-type";
import { GetWebsiteDataAction } from "./get-website-data";
import { GetWebsitePagesAction } from "./get-website-pages";
import { GetWebsiteSettingsAction } from "./get-website-settings";
import { MarkAsTemplateAction } from "./mark-as-template";
import { PublishChangesAction } from "./publish-changes";
import { RestorePageAction } from "./restore-page";
import { SearchPageTypeItemsAction } from "./search-page-type-items";
import { SearchPagesAction } from "./search-pages";
import { TakeOfflineAction } from "./take-offline";
import { UnmarkAsTemplateAction } from "./unmark-as-template";
import { UpdatePageAction } from "./update-page";
import { UpdatePageMetadataAction } from "./update-page-metadata";
import { UpdateWebsiteFieldsAction } from "./update-website-fields";
import { UpsertLibraryItemAction } from "./upsert-library-item";

/**
 * Registry of all available actions
 * This is a singleton that holds all action handlers
 */
class ChaiActionsRegistry {
  private static instance: ChaiActionsRegistry;
  private actions: Record<string, ChaiAction<any, any>> = {};

  private constructor() {
    registerChaiPageType("page", {
      name: "Static Page",
      icon: `<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M5 8V20H19V8H5ZM5 6H19V4H5V6ZM20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM7 10H11V14H7V10ZM7 16H17V18H7V16ZM13 11H17V13H13V11Z"></path></svg>`,
    });
    registerChaiPartialType("global", {
      name: "Global Block",
      helpText: "A global block can be reused in multiple pages.",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash-icon lucide-hash"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>`,
    });

    // Register all actions
    this.register("ASK_AI", new AskAIAction());
    this.register("CHECK_USER_ACCESS", new CheckUserAccessAction());
    this.register("CREATE_PAGE", new CreatePageAction());
    this.register("DELETE_PAGE", new DeletePageAction());
    this.register("DUPLICATE_PAGE", new DuplicatePageAction());
    this.register("RESTORE_PAGE_REVISION", new RestorePageAction());
    this.register("UPDATE_PAGE_METADATA", new UpdatePageMetadataAction());
    this.register("GENERATE_SEO_FIELD", new GenerateSeoFieldAction());
    this.register("GENERATE_HTML_FROM_PROMPT", new GenerateHtmlFromPromptAction());
    this.register("GET_REVISION_PAGE", new GetRevisionPageAction());
    this.register("UPDATE_PAGE", new UpdatePageAction());
    this.register("GET_COMPARE_DATA", new GetCompareDataAction());
    this.register("GET_SITE_WIDE_USAGE", new GetSiteWideDataAction());
    this.register("GET_WEBSITE_DRAFT_SETTINGS", new GetWebsiteSettingsAction());
    this.register("GET_WEBSITE_PAGES", new GetWebsitePagesAction());
    this.register("GET_LIBRARIES", new GetLibrariesAction());
    this.register("GET_DRAFT_PAGE", new GetDraftPageAction());
    this.register("GET_LANGUAGE_PAGES", new GetLanguagePagesAction());
    this.register("UPSERT_LIBRARY_ITEM", new UpsertLibraryItemAction());
    this.register("MARK_AS_TEMPLATE", new MarkAsTemplateAction());
    this.register("GET_LIBRARY_ITEM", new GetLibraryItemAction());
    this.register("GET_LIBRARY_ITEMS", new GetLibraryItemsAction());
    this.register("DELETE_LIBRARY_ITEM", new DeleteLibraryItemAction());
    this.register("UNMARK_AS_TEMPLATE", new UnmarkAsTemplateAction());
    this.register("GET_TEMPLATES_BY_TYPE", new GetTemplatesByTypeAction());
    this.register("SEARCH_PAGES", new SearchPagesAction());
    this.register("GET_PAGE_REVISIONS", new GetPageRevisionsAction());
    this.register("PUBLISH_CHANGES", new PublishChangesAction());
    this.register("UPDATE_WEBSITE_FIELDS", new UpdateWebsiteFieldsAction());
    this.register("TAKE_OFFLINE", new TakeOfflineAction());
    this.register("GET_CHANGES", new GetChangesAction());
    this.register("GET_LIBRARY_GROUPS", new GetLibraryGroupsAction());
    this.register("DELETE_PAGE_REVISION", new DeletePageRevisionAction());
    this.register("GET_COLLECTIONS", new GetCollectionsAction());
    this.register("GET_BLOCK_ASYNC_PROPS", new GetBlockAsyncPropsAction());
    this.register("GET_BUILDER_PAGE_DATA", new GetBuilderPageDataAction());
    this.register("GET_PAGE_TYPES", new GetPageTypesAction());
    this.register("SEARCH_PAGE_TYPE_ITEMS", new SearchPageTypeItemsAction());
    this.register("GET_DYNAMIC_PAGES", new GetDynamicPagesAction());
    this.register("GET_WEBSITE_DATA", new GetWebsiteDataAction());
    this.register("GET_PAGE_ALL_DATA", new GetPageAllDataAction());
    // Add more actions here as they are created
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): ChaiActionsRegistry {
    if (!ChaiActionsRegistry.instance) {
      ChaiActionsRegistry.instance = new ChaiActionsRegistry();
    }
    return ChaiActionsRegistry.instance;
  }

  /**
   * Register a new action handler
   */
  public register(actionName: string, handler: ChaiAction<any, any>): void {
    this.actions[actionName] = handler;
  }

  public registerActions(actions: Record<string, ChaiAction<any, any>>): void {
    for (const [actionName, handler] of Object.entries(actions)) {
      this.register(actionName, handler);
    }
  }

  /**
   * Get an action handler by name
   */
  public getAction(actionName: string): ChaiAction<any, any> | undefined {
    return get(this.actions, actionName);
  }

  /**
   * Get all registered actions
   */
  public getAllActions(): Record<string, ChaiAction<any, any>> {
    return this.actions;
  }
}

// Export a function to get an action by name
export const getChaiAction = (action: string): ChaiAction<any, any> | undefined => {
  return ChaiActionsRegistry.getInstance().getAction(action);
};

// Export the registry instance for direct access if needed
export default ChaiActionsRegistry.getInstance();
