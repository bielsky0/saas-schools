import { db, safeQuery, schema } from "~/actions/db";
import { and, eq } from "drizzle-orm";
import { orderBy } from "lodash-es";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for GetPageRevisionsAction
 */
type GetPageRevisionsActionData = {
  pageId: string;
};

type GetPageRevisionsActionResponse = Array<{
  uid: string;
  currentEditor: string | null;
  createdAt: string;
  type: string | null;
}>;

/**
 * Action to get revisions for a specific page
 */
export class GetPageRevisionsAction extends ChaiBaseAction<GetPageRevisionsActionData, GetPageRevisionsActionResponse> {
  /**
   * Define the validation schema for get page revisions action
   */
  protected getValidationSchema() {
    return z.object({
      pageId: z.string().min(1, "Page ID is required"),
    });
  }

  /**
   * Execute the get page revisions action
   */
  async execute(data: GetPageRevisionsActionData): Promise<GetPageRevisionsActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    try {
      return await this.getRevisions(data.pageId);
    } catch (error) {
      if (error instanceof ActionError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Failed to get page revisions";
      throw new ActionError(message, "GET_PAGE_REVISIONS_ERROR");
    }
  }

  /**
   * Main logic to get page revisions
   */
  private async getRevisions(pageId: string): Promise<GetPageRevisionsActionResponse> {
    const { data, error } = await safeQuery(() =>
      db
        .select({
          currentEditor: schema.appPages.currentEditor,
          createdAt: schema.appPages.createdAt,
        })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.app, this.context!.appId), eq(schema.appPages.id, pageId))),
    );

    const { data: revisions, error: revisionsError } = await safeQuery(() =>
      db
        .select({
          uid: schema.appPagesRevisions.uid,
          currentEditor: schema.appPagesRevisions.currentEditor,
          createdAt: schema.appPagesRevisions.createdAt,
          type: schema.appPagesRevisions.type,
        })
        .from(schema.appPagesRevisions)
        .where(and(eq(schema.appPagesRevisions.app, this.context!.appId), eq(schema.appPagesRevisions.id, pageId))),
    );

    if (error) {
      const message =
        error instanceof Error
          ? `Error getting current page for revisions: ${error.message}`
          : "Error getting current page for revisions";
      throw new ActionError(message, "ERROR_GETTING_CURRENT_PAGE_FOR_REVISIONS");
    }

    if (revisionsError) {
      const message =
        revisionsError instanceof Error
          ? `Error getting page revisions: ${revisionsError.message}`
          : "Error getting page revisions";
      throw new ActionError(message, "ERROR_GETTING_PAGE_REVISIONS");
    }

    // Map current page data to match the expected format (at most one current page)
    const page = data?.[0];
    const currentPage = page
      ? [
          {
            ...page,
            type: "published",
            uid: "current",
          },
        ]
      : [];

    // Merge the two arrays
    const merged = [...currentPage, ...(revisions ?? [])];

    // Sort by createdAt in descending order
    return orderBy(merged, ["createdAt"], ["desc"]);
  }
}
