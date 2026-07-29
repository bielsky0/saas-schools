import { db, safeQuery, schema } from "~/actions/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for UnmarkAsTemplateAction
 */
type UnmarkAsTemplateActionData = {
  id: string; // pageId to unmark
};

type UnmarkAsTemplateActionResponse = {
  success: boolean;
};

/**
 * Action to unmark a page as a template (delete from library_templates)
 */
export class UnmarkAsTemplateAction extends ChaiBaseAction<UnmarkAsTemplateActionData, UnmarkAsTemplateActionResponse> {
  /**
   * Define the validation schema for unmark as template action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
    });
  }

  /**
   * Execute the unmark as template action
   */
  async execute(data: UnmarkAsTemplateActionData): Promise<UnmarkAsTemplateActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { id } = data;

    // Delete the template by pageId
    const { error } = await safeQuery(() =>
      db.delete(schema.libraryTemplates).where(eq(schema.libraryTemplates.pageId, id)),
    );

    if (error) {
      throw new ActionError("Failed to unmark page as template", "DELETE_FAILED", 500, error);
    }

    return { success: true };
  }
}
