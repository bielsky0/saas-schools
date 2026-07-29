import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { apiError } from "~/actions/lib";
import { PageTreeBuilder } from "~/actions/utils/page-tree-builder";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for DeletePageAction
 */
type DeletePageActionData = {
  id: string;
};

type DeletePageActionResponse = {
  tags: string[];
  page?: any;
  deletedLanguagePages?: number;
  deletedNestedChildren?: number;
  totalDeleted?: number;
  code?: string;
  editor?: string;
};

/**
 * Action to delete a page and all its associated data
 * This includes:
 * - The page itself
 * - All nested children pages
 * - All language variant pages
 * - Language variants of nested children
 */
export class DeletePageAction extends ChaiBaseAction<DeletePageActionData, DeletePageActionResponse> {
  private appId: string = "";
  private userId: string = "";
  private pageTreeBuilder?: PageTreeBuilder;

  /**
   * Define the validation schema for delete page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1, "Page ID is required"),
    });
  }

  /**
   * Execute the delete page action
   */
  async execute(data: DeletePageActionData): Promise<DeletePageActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    this.appId = this.context.appId;
    this.userId = this.context.userId || "";

    try {
      // Initialize PageTreeBuilder with ORM
      this.pageTreeBuilder = new PageTreeBuilder(this.appId);

      // Execute the delete operation
      return await this.deletePage(data.id);
    } catch (error) {
      // Handle known errors
      if (error instanceof ActionError) {
        throw error;
      }

      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Failed to delete page";
      throw new ActionError(message, "DELETE_PAGE_ERROR");
    }
  }

  /**
   * Main delete page logic
   */
  public async deletePage(id: string): Promise<any> {
    // Check if page is currently being edited by another user
    const currentEditor = await this.getCurrentEditor(id);
    if (currentEditor && currentEditor !== this.userId) {
      return { tags: [], code: "PAGE_LOCKED", editor: currentEditor };
    }

    const pagesTree = await this.pageTreeBuilder!.getPagesTree();

    const pageInLanguageTree = this.pageTreeBuilder!.findPageInLanguageTree(id, pagesTree.languageTree);
    const pageInPrimaryTree = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!pageInLanguageTree && !pageInPrimaryTree) {
      throw apiError("ERROR_DELETING_PAGE", "Page not found");
    }

    const isLanguagePage = pageInLanguageTree !== null;

    if (isLanguagePage) {
      return await this.deleteLanguagePageWithTree(id, pageInLanguageTree!, pagesTree);
    } else {
      return await this.deletePrimaryPageWithTree(id, pagesTree);
    }
  }

  /**
   * Perform Deletion With Ids using Drizzle ORM
   */
  public async performDeletionWithIds(ids: string[]): Promise<any> {
    const reverseIds = [...ids].reverse();

    // Delete from library_templates
    const { error: libError } = await safeQuery(() =>
      db.delete(schema.libraryTemplates).where(inArray(schema.libraryTemplates.pageId, reverseIds)),
    );
    if (libError) throw apiError("DELETE_FAILED", libError);

    // Delete from app_pages_revisions
    const { error: revError } = await safeQuery(() =>
      db.delete(schema.appPagesRevisions).where(inArray(schema.appPagesRevisions.id, reverseIds)),
    );
    if (revError) throw apiError("DELETE_FAILED", revError);

    // Delete from app_pages
    const { error: pagesError } = await safeQuery(() =>
      db.delete(schema.appPages).where(inArray(schema.appPages.id, reverseIds)),
    );
    if (pagesError) throw apiError("DELETE_FAILED", pagesError);

    // Delete from app_pages_online
    const { error: onlineError } = await safeQuery(() =>
      db.delete(schema.appPagesOnline).where(inArray(schema.appPagesOnline.id, reverseIds)),
    );
    if (onlineError) throw apiError("DELETE_FAILED", onlineError);
  }

  /**
   * Delete a language page using tree data
   */
  public async deleteLanguagePageWithTree(id: string, langNode: any, pagesTree: any): Promise<any> {
    const primaryPageId = langNode.primaryPage;
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(primaryPageId, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }
    const allNestedLanguageIds = this.pageTreeBuilder!.collectNestedChildIds(langNode);

    await this.performDeletionWithIds([id, ...allNestedLanguageIds]);
    return {
      tags: [`page-${id}`, ...allNestedLanguageIds.map((pageId) => `page-${pageId}`)],
      totalDeleted: 1 + allNestedLanguageIds.length,
    };
  }

  /**
   * Delete a primary page using tree data
   */
  public async deletePrimaryPageWithTree(id: string, pagesTree: any): Promise<any> {
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }
    const nestedPrimaryChildIds = this.pageTreeBuilder!.collectNestedChildIds(primaryNode);

    const languageVariants = this.pageTreeBuilder!.findLanguagePagesForPrimary(id, pagesTree.languageTree);
    const languagePageIds: string[] = [];

    languageVariants.forEach((langVariant) => {
      languagePageIds.push(langVariant.id);
      const nestedIds = this.pageTreeBuilder!.collectNestedChildIds(langVariant);
      languagePageIds.push(...nestedIds);
    });

    const allLanguagePageIds = [...new Set([...nestedPrimaryChildIds, ...languagePageIds])];
    await this.performDeletionWithIds([id, ...allLanguagePageIds]);
    return {
      tags: [`page-${id}`, ...allLanguagePageIds.map((pageId) => `page-${pageId}`)],
      totalDeleted: 1 + allLanguagePageIds.length,
    };
  }

  /**
   * Get current editor for a page
   */
  public async getCurrentEditor(id: string): Promise<string | null> {
    const { data, error } = await safeQuery(() =>
      db
        .select({ currentEditor: schema.appPages.currentEditor })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId)))
        .limit(1),
    );

    if (error || !data || data.length === 0) return null;
    return data[0]?.currentEditor || null;
  }
}
