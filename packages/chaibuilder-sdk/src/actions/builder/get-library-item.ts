import { db, safeQuery, schema } from "~/actions/db";
import { eq } from "drizzle-orm";
import { set } from "lodash-es";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for GetLibraryItemAction
 */
type GetLibraryItemActionData = {
  id: string;
};

type GetLibraryItemActionResponse = {
  id: string;
  name: string | null;
  blocks: unknown;
  description: string | null;
  group: string | null;
  user: string | null;
  preview: string | null;
  createdAt: string;
  html: string | null;
};

/**
 * Action to get a single library item by ID
 */
export class GetLibraryItemAction extends ChaiBaseAction<GetLibraryItemActionData, GetLibraryItemActionResponse> {
  /**
   * Define the validation schema for get library item action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
    });
  }

  /**
   * Execute the get library item action
   */
  async execute(data: GetLibraryItemActionData): Promise<GetLibraryItemActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { id } = data;

    // Fetch library item with library data using leftJoin
    const { data: results, error } = await safeQuery(() =>
      db
        .select({
          id: schema.libraryItems.id,
          name: schema.libraryItems.name,
          blocks: schema.libraryItems.blocks,
          library: schema.libraryItems.library,
          description: schema.libraryItems.description,
          group: schema.libraryItems.group,
          user: schema.libraryItems.user,
          preview: schema.libraryItems.preview,
          createdAt: schema.libraryItems.createdAt,
          html: schema.libraryItems.html,
          libraryApp: schema.libraries.app,
          libraryName: schema.libraries.name,
        })
        .from(schema.libraryItems)
        .leftJoin(schema.libraries, eq(schema.libraryItems.library, schema.libraries.id))
        .where(eq(schema.libraryItems.id, id)),
    );

    if (error) {
      throw new ActionError("Failed to fetch library item", "GET_LIBRARY_ITEM_FAILED", 500, error);
    }

    if (!results || results.length === 0) {
      throw new ActionError("Library item not found", "GET_LIBRARY_ITEM_FAILED");
    }

    const libraryItem = results[0]!;
    const blocks: any = Array.isArray(libraryItem.blocks) ? [...libraryItem.blocks] : libraryItem.blocks;

    // If library belongs to current app, set _libBlockId on first block
    if (libraryItem.libraryApp === appId) {
      set(blocks, "0._libBlockId", libraryItem.id);
    } else {
      // Remove _libBlockId from first block for external libraries
      set(blocks, "0._libBlockId", undefined);
    }

    // Return result without library fields
    return {
      id: libraryItem.id,
      name: libraryItem.name,
      blocks,
      description: libraryItem.description,
      group: libraryItem.group,
      user: libraryItem.user,
      preview: libraryItem.preview,
      createdAt: libraryItem.createdAt,
      html: libraryItem.html,
    };
  }
}
