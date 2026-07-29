import { db, safeQuery, schema } from "~/actions/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for DeleteLibraryItemAction
 */
type DeleteLibraryItemActionData = {
  id: string;
};

type DeleteLibraryItemActionResponse = {
  success: boolean;
};

/**
 * Action to delete a library item
 */
export class DeleteLibraryItemAction extends ChaiBaseAction<
  DeleteLibraryItemActionData,
  DeleteLibraryItemActionResponse
> {
  /**
   * Define the validation schema for delete library item action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
    });
  }

  /**
   * Execute the delete library item action
   */
  async execute(data: DeleteLibraryItemActionData): Promise<DeleteLibraryItemActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { id } = data;

    // Delete the library item
    const { error } = await safeQuery(() => db.delete(schema.libraryItems).where(eq(schema.libraryItems.id, id)));

    if (error) {
      throw new ActionError("Failed to delete library item", "DELETE_LIBRARY_ITEM_FAILED", 500, error);
    }

    return { success: true };
  }
}
