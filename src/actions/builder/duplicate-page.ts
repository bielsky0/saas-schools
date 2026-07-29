import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for DuplicatePageAction
 */
type DuplicatePageActionData = {
  pageId: string;
  name: string;
  slug?: string;
};

type DuplicatePageActionResponse = {
  id: string;
};

/**
 * Action to duplicate a page
 */
export class DuplicatePageAction extends ChaiBaseAction<DuplicatePageActionData, DuplicatePageActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      pageId: z.string().nonempty(),
      name: z.string().nonempty(),
      slug: z.string().optional(),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: DuplicatePageActionData): Promise<DuplicatePageActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    // Validate slug uniqueness if provided
    if (data.slug) {
      const slugExists = await this.doesSlugExist(data.slug);
      if (slugExists) {
        throw new ActionError("Slug already exists", "SLUG_EXISTS");
      }
    }

    const { data: originalPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.id, data.pageId), eq(schema.appPages.app, appId)),
      }),
    );

    if (error) {
      throw error;
    }

    // Validate original page exists
    if (!originalPage) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    const duplicatedPageData = {
      ...originalPage,
      id: undefined,
      createdAt: undefined,
      name: data.name,
      currentEditor: null,
      changes: null,
      online: false,
      libRefId: null,
      lastSaved: null,
      ...(data.slug && { slug: data.slug }),
    };

    const [result] = await db.insert(schema.appPages).values(duplicatedPageData).returning({ id: schema.appPages.id });

    if (!result) {
      throw new ActionError("Failed to create duplicate page", "INSERT_FAILED");
    }

    return { id: result.id };
  }

  private async doesSlugExist(slug: string): Promise<boolean> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { data: existingPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.slug, slug), eq(schema.appPages.app, appId)),
        columns: {
          id: true,
        },
      }),
    );

    if (error) {
      throw new ActionError(`${error.message}`, "SLUG_CHECK_FAILED");
    }
    return !!existingPage;
  }
}
