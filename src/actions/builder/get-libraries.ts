import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery } from "~/actions/db";
import { libraries } from "~/actions/drizzle/schema";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

type GetLibrariesActionData = Record<string, never>;

type Library = {
  id: string;
  name: string | null;
  type: string | null;
  createdAt: string;
  isSiteLibrary: boolean;
};

type GetLibrariesActionResponse = Library[];

export class GetLibrariesAction extends ChaiBaseAction<GetLibrariesActionData, GetLibrariesActionResponse> {
  protected getValidationSchema() {
    return z.object({}).optional().default({});
  }

  async execute(): Promise<GetLibrariesActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    const { appId } = this.context;
    // First, get the site library for the current app
    const siteLibraryQuery = await safeQuery(() =>
      db
        .select({
          id: libraries.id,
          name: libraries.name,
          type: libraries.type,
          createdAt: libraries.createdAt,
        })
        .from(libraries)
        .where(eq(libraries.app, appId))
        .limit(1),
    );

    if (siteLibraryQuery.error) {
      throw new ActionError("Failed to fetch site library", "DB_ERROR");
    }

    const siteLibrary = siteLibraryQuery.data[0] || null;

    const clientId = process?.env?.CHAIBUILDER_CLIENT_ID || null;

    // Only fetch libraries if clientId exists
    if (!clientId) {
      // If no client, return only the site library if it exists
      return siteLibrary
        ? [
            {
              id: siteLibrary.id,
              name: siteLibrary.name,
              type: siteLibrary.type,
              createdAt: siteLibrary.createdAt,
              isSiteLibrary: true,
            },
          ]
        : [];
    }

    // Fetch libraries that belong to the current client or are global (client is null)
    const { data: librariesQuery, error: librariesQueryError } = await safeQuery(() =>
      db
        .select({
          id: libraries.id,
          name: libraries.name,
          type: libraries.type,
          createdAt: libraries.createdAt,
        })
        .from(libraries)
        .where(eq(libraries.client, clientId)),
    );

    if (librariesQueryError) {
      throw new ActionError("Failed to fetch libraries", "DB_ERROR");
    }

    // Map the results and mark the site library
    const siteLibraryId = siteLibrary?.id || null;
    return librariesQuery.map((lib) => ({
      id: lib.id,
      name: lib.name,
      type: lib.type,
      createdAt: lib.createdAt,
      isSiteLibrary: siteLibraryId ? lib.id === siteLibraryId : false,
    }));
  }
}
