import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for GetLibraryItemsAction
 */
type GetLibraryItemsActionData = {
  id: string; // library id
};

type GetLibraryItemsActionResponse = Array<{
  id: string;
  name: string | null;
  library: string | null;
  group: string | null;
  description: string | null;
  preview: string | null;
}>;

/**
 * Action to get all items from a library
 */
export class GetLibraryItemsAction extends ChaiBaseAction<GetLibraryItemsActionData, GetLibraryItemsActionResponse> {
  /**
   * Define the validation schema for get library items action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
    });
  }

  /**
   * Execute the get library items action
   */
  async execute(data: GetLibraryItemsActionData): Promise<GetLibraryItemsActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { id } = data;

    // Fetch library items for the given library
    const { data: items, error } = await safeQuery(() =>
      db
        .select({
          id: schema.libraryItems.id,
          name: schema.libraryItems.name,
          library: schema.libraryItems.library,
          group: schema.libraryItems.group,
          description: schema.libraryItems.description,
          preview: schema.libraryItems.preview,
        })
        .from(schema.libraryItems)
        .where(eq(schema.libraryItems.library, id)),
    );

    if (error) {
      throw new ActionError("Failed to fetch library items", "GET_LIBRARY_ITEMS_FAILED", 500, error);
    }

    return items || [];
  }
}
