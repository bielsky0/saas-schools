import { db, safeQuery, schema } from "~/actions/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for TakeOfflineAction
 */
type TakeOfflineActionData = {
  id: string;
};

type TakeOfflineActionResponse = {
  tags: string[];
  page?: any;
};

/**
 * Action to take a page offline
 * This includes:
 * - Setting the page's online status to false
 * - Removing the page from the online pages table
 * - Handling different page types (primary, language, partial)
 */
export class TakeOfflineAction extends ChaiBaseAction<TakeOfflineActionData, TakeOfflineActionResponse> {
  private appId: string = "";

  /**
   * Define the validation schema for take offline action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1, "Page ID is required"),
    });
  }

  /**
   * Execute the take offline action
   */
  async execute(data: TakeOfflineActionData): Promise<TakeOfflineActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    this.appId = this.context.appId;

    try {
      // Execute the take offline operation
      return await this.takeOffline(data.id);
    } catch (error) {
      // Handle known errors
      if (error instanceof ActionError) {
        throw error;
      }

      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Failed to take page offline";
      throw new ActionError(message, "TAKE_OFFLINE_ERROR");
    }
  }

  /**
   * Main take offline logic
   */
  private async takeOffline(id: string): Promise<TakeOfflineActionResponse> {
    // Get the page type
    const pageType = await this.getPageType(id);

    // Update the page's online status to false
    const { error: updateError } = await safeQuery(() =>
      db
        .update(schema.appPages)
        .set({ online: false })
        .where(and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId))),
    );

    if (updateError) {
      throw new ActionError("Error taking page offline", "ERROR_TAKING_PAGE_OFFLINE");
    }

    // Delete from online pages table
    await this.deleteOnlinePage(id);

    // Handle different page types
    if (pageType === "language") {
      const primaryPage = await this.getPrimaryPage(id);
      return { tags: [`page-${primaryPage}`] };
    }

    if (pageType === "partial") {
      const pagesUsingPartial = await this.getPartialBlockUsage(id);
      return { tags: [...pagesUsingPartial.map((page) => `page-${page}`)] };
    }

    // For primary pages, return the page data
    const { data: pages, error: pageError } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          slug: schema.appPages.slug,
          lang: schema.appPages.lang,
          pageType: schema.appPages.pageType,
          name: schema.appPages.name,
          online: schema.appPages.online,
          seo: schema.appPages.seo,
        })
        .from(schema.appPages)
        .where(eq(schema.appPages.id, id)),
    );

    if (pageError || !pages || pages.length === 0) {
      throw new ActionError("Error getting page after taking offline", "ERROR_TAKING_PAGE_OFFLINE");
    }

    return { tags: [`page-${id}`], page: pages[0] };
  }

  /**
   * Delete page from online pages table
   */
  private async deleteOnlinePage(id: string): Promise<void> {
    // Delete the page itself
    const { error: deleteError } = await safeQuery(() =>
      db.delete(schema.appPagesOnline).where(eq(schema.appPagesOnline.id, id)),
    );

    if (deleteError) {
      throw new ActionError(
        "Error deleting page from online pages table",
        "ERROR_DELETING_PAGE_FROM_ONLINE_PAGES_TABLE",
      );
    }

    // Delete pages where this is the primary page
    const { error: deletePrimaryError } = await safeQuery(() =>
      db.delete(schema.appPagesOnline).where(eq(schema.appPagesOnline.primaryPage, id)),
    );

    if (deletePrimaryError) {
      throw new ActionError(
        "Error deleting page from online pages table",
        "ERROR_DELETING_PAGE_FROM_ONLINE_PAGES_TABLE",
      );
    }
  }

  /**
   * Get the page type
   */
  private async getPageType(id: string): Promise<"primary" | "partial" | "language"> {
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          primaryPage: schema.appPages.primaryPage,
          pageType: schema.appPages.pageType,
          slug: schema.appPages.slug,
        })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId))),
    );

    if (error || !pages || pages.length === 0) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    const page = pages[0]!;
    const isEmpty = (str: string | null | undefined) => !str || str.trim() === "";

    return isEmpty(page.slug) ? "partial" : !page.primaryPage ? "primary" : "language";
  }

  /**
   * Get the primary page ID for a language page
   */
  private async getPrimaryPage(id: string): Promise<string> {
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          primaryPage: schema.appPages.primaryPage,
        })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId))),
    );

    if (error || !pages || pages.length === 0) {
      throw new ActionError("Error getting primary page", "ERROR_GETTING_PRIMARY_PAGE");
    }

    const page = pages[0]!;
    return page.primaryPage ?? page.id;
  }

  /**
   * Get pages that use this partial block
   */
  private async getPartialBlockUsage(partialId: string): Promise<string[]> {
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          partialBlocks: schema.appPages.partialBlocks,
        })
        .from(schema.appPages)
        .where(eq(schema.appPages.app, this.appId)),
    );

    if (error || !pages) {
      return [];
    }

    // Filter pages that contain this partial block ID in their partialBlocks string
    return pages
      .filter((page) => {
        const partialBlocks = page.partialBlocks || "";
        return partialBlocks.split("|").includes(partialId);
      })
      .map((page) => page.id);
  }
}
