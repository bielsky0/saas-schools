import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { apiError } from "~/actions/lib";
import { ChaiBaseAction } from "./base-action";

type GetDraftPageActionData = {
  id: string;
};

type GetDraftPageActionResponse = {
  id: string;
  name: string;
  slug: string;
  lang: string;
  primaryPage?: string | null;
  seo: any;
  pageType?: string | null;
  lastSaved?: string | null;
  dynamic: boolean | null;
  parent?: string | null;
  blocks: any[];
  languagePageId: string;
};

export class GetDraftPageAction extends ChaiBaseAction<GetDraftPageActionData, GetDraftPageActionResponse> {
  protected getValidationSchema() {
    return z.object({
      id: z.string(),
    });
  }

  async execute(data: GetDraftPageActionData): Promise<GetDraftPageActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const { id } = data;

    // Always use the draft table for this action
    const targetTable = schema.appPages;

    // Get page data and blocks in a single query using a subquery
    const { data: pageData, error } = await safeQuery(() =>
      db
        .select({
          id: targetTable.id,
          name: targetTable.name,
          slug: targetTable.slug,
          lang: targetTable.lang,
          primaryPage: targetTable.primaryPage,
          seo: targetTable.seo,
          currentEditor: targetTable.currentEditor,
          pageType: targetTable.pageType,
          lastSaved: targetTable.lastSaved,
          dynamic: targetTable.dynamic,
          parent: targetTable.parent,
          blocks: targetTable.blocks,
        })
        .from(targetTable)
        .where(and(eq(targetTable.app, appId), eq(targetTable.id, id)))
        .limit(1),
    );

    if (error) {
      throw apiError("PAGE_NOT_FOUND", error);
    }

    if (!pageData || pageData.length === 0) {
      throw apiError("PAGE_NOT_FOUND", new Error("Page not found"));
    }

    const page = pageData[0];

    const primaryPageId = page.primaryPage ?? page.id;

    // Get blocks from the primary page if different from current page
    let blocks = (page.blocks as any[]) ?? [];

    if (primaryPageId !== page.id) {
      // Need to fetch blocks from primary page
      const { data: primaryPageData, error: primaryPageError } = await safeQuery(() =>
        db
          .select({
            blocks: targetTable.blocks,
          })
          .from(targetTable)
          .where(and(eq(targetTable.app, appId), eq(targetTable.id, primaryPageId)))
          .limit(1),
      );

      if (primaryPageError) {
        throw apiError("BLOCKS_NOT_FOUND", primaryPageError);
      }

      blocks = (primaryPageData?.[0]?.blocks as any[]) ?? [];
    }

    return {
      ...page,
      blocks,
      id,
      languagePageId: page.id,
    };
  }
}
