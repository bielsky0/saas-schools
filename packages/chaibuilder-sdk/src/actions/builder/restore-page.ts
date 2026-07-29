import { and, eq } from "drizzle-orm";
import { pick } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for RestorePageAction
 */
type RestorePageActionData = {
  revisionId: string;
  discardCurrent: boolean;
  pageId?: string;
};

type RestorePageActionResponse = {
  success: boolean;
  pageId: string;
};

/**
 * Action to restore a page revision
 */
export class RestorePageAction extends ChaiBaseAction<RestorePageActionData, RestorePageActionResponse> {
  /**
   * Define the validation schema for restore page action
   */
  protected getValidationSchema() {
    return z.object({
      revisionId: z.string().nonempty(),
      discardCurrent: z.boolean(),
      pageId: z.string().optional(),
    });
  }

  /**
   * Execute the restore page action
   */
  async execute(data: RestorePageActionData): Promise<RestorePageActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    let pageId: string;
    let blocks: any;

    // Handle special case when revisionId is "current" (live page)
    if (data.revisionId === "current") {
      // Fetch from app_pages_online table for live revision
      if (!data.pageId) {
        throw new ActionError("pageId is required when restoring current revision", "PAGE_ID_REQUIRED");
      }

      const { data: onlinePage, error: onlinePageError } = await safeQuery(() =>
        db.query.appPagesOnline.findFirst({
          where: and(eq(schema.appPagesOnline.id, data.pageId!), eq(schema.appPagesOnline.app, appId)),
          columns: {
            id: true,
            blocks: true,
          },
        }),
      );

      if (onlinePageError) {
        throw new ActionError("Error fetching live page", "FETCH_ERROR");
      }

      if (!onlinePage) {
        throw new ActionError("Live page not found", "PAGE_NOT_FOUND");
      }

      pageId = onlinePage.id;
      blocks = onlinePage.blocks;
    } else {
      // Fetch from app_pages_revisions table for regular revisions
      const { data: revision, error: revisionError } = await safeQuery(() =>
        db.query.appPagesRevisions.findFirst({
          where: and(eq(schema.appPagesRevisions.uid, data.revisionId), eq(schema.appPagesRevisions.app, appId)),
          columns: {
            id: true,
            blocks: true,
            type: true,
          },
        }),
      );

      if (revisionError) {
        throw new ActionError("Error fetching revision", "FETCH_ERROR");
      }

      if (!revision) {
        throw new ActionError("Revision not found", "REVISION_NOT_FOUND");
      }

      pageId = revision.id;
      blocks = revision.blocks;
    }

    // If not discarding current, save current page as a draft revision
    if (!data.discardCurrent) {
      const { data: currentPage, error: currentPageError } = await safeQuery(() =>
        db.query.appPages.findFirst({
          where: and(eq(schema.appPages.id, pageId), eq(schema.appPages.app, appId)),
        }),
      );

      if (currentPageError) {
        throw new ActionError("Error fetching current page", "FETCH_ERROR");
      }

      if (!currentPage) {
        throw new ActionError("Current page not found", "PAGE_NOT_FOUND");
      }

      const currentPageBlocks = currentPage.blocks;

      // Create a new draft revision with current page content
      const revisionData = {
        id: pageId,
        blocks: currentPageBlocks,
        type: "draft",
        createdAt: "now()",
        ...pick(currentPage, ["name", "slug", "pageType", "lang", "app", "currentEditor"]),
      };

      await db.insert(schema.appPagesRevisions).values(revisionData);
    }

    // Update the current page with the revision blocks
    await db.update(schema.appPages).set({ blocks }).where(eq(schema.appPages.id, pageId));

    return { success: true, pageId };
  }
}
