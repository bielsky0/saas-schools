import { eq } from "drizzle-orm";
import { map, uniq } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for GetLibraryGroupsAction
 */
type GetLibraryGroupsActionData = Record<string, never>; // Empty object

type GetLibraryGroupsActionResponse = Array<{
  id: string;
  name: string;
}>;

/**
 * Action to get all unique groups from library items
 */
export class GetLibraryGroupsAction extends ChaiBaseAction<GetLibraryGroupsActionData, GetLibraryGroupsActionResponse> {
  /**
   * Define the validation schema for get library groups action
   */
  protected getValidationSchema() {
    return z.object({});
  }

  /**
   * Execute the get library groups action
   */
  async execute(): Promise<GetLibraryGroupsActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    // Get the site library for this app
    const { data: library, error: libraryError } = await safeQuery(() =>
      db
        .select({
          id: schema.libraries.id,
        })
        .from(schema.libraries)
        .where(eq(schema.libraries.app, this.context!.appId))
        .limit(1),
    );

    if (libraryError) {
      throw new ActionError("Failed to fetch site library", "GET_SITE_LIBRARY_FAILED", 500, libraryError);
    }

    if (!library || library.length === 0) {
      return [];
    }

    const siteLibrary = library[0];

    // Fetch all groups from library items
    const { data: items, error } = await safeQuery(() =>
      db
        .select({
          group: schema.libraryItems.group,
        })
        .from(schema.libraryItems)
        .where(eq(schema.libraryItems.library, siteLibrary.id)),
    );

    if (error) {
      throw new ActionError("Failed to fetch library groups", "GET_LIBRARY_GROUPS_FAILED", 500, error);
    }

    // Extract unique groups and map to response format
    // Filter out null/undefined values before mapping
    const groups = map(items, "group").filter((group): group is string => group !== null && group !== undefined);
    return map(uniq(groups), (group) => ({
      id: group,
      name: group,
    }));
  }
}
