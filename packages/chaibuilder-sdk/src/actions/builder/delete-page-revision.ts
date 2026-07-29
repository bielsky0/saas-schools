import { db, safeQuery, schema } from "~/actions/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for DeletePageRevisionAction
 */
type DeletePageRevisionActionData = {
  revisionId: string;
};

type DeletePageRevisionActionResponse = {
  success: boolean;
};

/**
 * Action to delete a page revision
 */
export class DeletePageRevisionAction extends ChaiBaseAction<
  DeletePageRevisionActionData,
  DeletePageRevisionActionResponse
> {
  /**
   * Define the validation schema for delete page revision action
   */
  protected getValidationSchema() {
    return z.object({
      revisionId: z.string().nonempty("Revision ID is required"),
    });
  }

  /**
   * Execute the delete page revision action
   */
  async execute(data: DeletePageRevisionActionData): Promise<DeletePageRevisionActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    const { appId } = this.context;

    // Delete the revision from the database
    const { error } = await safeQuery(() =>
      db
        .delete(schema.appPagesRevisions)
        .where(and(eq(schema.appPagesRevisions.uid, data.revisionId), eq(schema.appPagesRevisions.app, appId))),
    );

    if (error) {
      throw new ActionError("Failed to delete page revision", "DELETE_REVISION_ERROR");
    }

    return { success: true };
  }
}
