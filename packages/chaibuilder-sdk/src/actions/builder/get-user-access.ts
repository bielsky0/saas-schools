import { and, eq } from "drizzle-orm";
import { db, safeQuery, schema } from "../db";
import { ActionError } from "./action-error";
import { ChaiActionContext } from "./chai-action-interface";

/**
 * Fetches the user access record from the database for the given context.
 * @param context The action context containing appId and userId
 * @returns The user access record
 * @throws ActionError if context is invalid or user does not have access
 */
export async function getUserAccess(context: ChaiActionContext): Promise<any> {
  const { appId, userId } = context;
  if (!userId) {
    throw new ActionError("User ID not found in context", "UNAUTHORIZED", 401);
  }
  const { data: userAccess, error } = await safeQuery(() =>
    db
      .select()
      .from(schema.appUsers)
      .where(
        and(eq(schema.appUsers.app, appId), eq(schema.appUsers.user, userId), eq(schema.appUsers.status, "active")),
      ),
  );

  if (error) {
    throw new ActionError("Error checking user access", "ERROR_CHECKING_USER_ACCESS", 500, error);
  }

  if (!userAccess || userAccess.length === 0) {
    throw new ActionError("User does not have access to this app", "UNAUTHORIZED", 401);
  }

  return userAccess[0];
}
