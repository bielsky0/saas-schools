import { and, eq, inArray } from "drizzle-orm";
import { get, has, isEmpty } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { apiError } from "~/actions/lib";
import { ChaiBlock } from "~/types/common";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for GenerateSeoFieldAction
 */
type GetRevisionPageActionData = {
  id: string;
  type: "draft" | "live" | "revision";
  lang?: string;
};

type GetRevisionPageActionResponse = {
  id: string;
  blocks: ChaiBlock[];
} & Record<string, any>;

/**
 * Action to generate SEO fields for a page
 */
export class GetRevisionPageAction extends ChaiBaseAction<GetRevisionPageActionData, GetRevisionPageActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty(),
      type: z.enum(["draft", "live", "revision"]),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: GetRevisionPageActionData): Promise<GetRevisionPageActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    let blocksData;
    let error;

    // Fetch data based on type using Drizzle ORM
    switch (data.type) {
      case "draft":
        ({ data: blocksData, error } = await safeQuery(() =>
          db.query.appPages.findFirst({
            where: and(eq(schema.appPages.id, data.id), eq(schema.appPages.lang, data.lang ?? "")),
          }),
        ));
        break;

      case "live":
        ({ data: blocksData, error } = await safeQuery(() =>
          db.query.appPagesOnline.findFirst({
            where: and(eq(schema.appPagesOnline.id, data.id), eq(schema.appPagesOnline.lang, data.lang ?? "")),
          }),
        ));
        break;

      case "revision":
        ({ data: blocksData, error } = await safeQuery(() =>
          db.query.appPagesRevisions.findFirst({
            where: and(eq(schema.appPagesRevisions.uid, data.id), eq(schema.appPagesRevisions.lang, data.lang ?? "")),
          }),
        ));
        break;
    }

    if (error || !blocksData) {
      throw apiError("NOT_FOUND", error || new Error("Page not found"));
    }

    // Merge partial blocks
    let blocks = (blocksData?.blocks as ChaiBlock[]) ?? [];
    blocks = await this.getMergedBlocks(blocks, data.type === "draft", this.context.appId);

    return {
      ...blocksData,
      blocks,
    };
  }

  /**
   * Merge partial blocks into the main blocks array
   * Optimized to fetch all partial blocks in a single query
   */
  private async getMergedBlocks(blocks: ChaiBlock[], draft: boolean, appId: string): Promise<ChaiBlock[]> {
    const table = draft ? schema.appPages : schema.appPagesOnline;
    const partialBlocksList = blocks.filter(({ _type }) => _type === "GlobalBlock" || _type === "PartialBlock");

    if (partialBlocksList.length === 0) {
      return blocks;
    }

    // Collect all partial block IDs
    const partialBlockIds = partialBlocksList
      .map((partialBlock) => get(partialBlock, "partialBlockId", get(partialBlock, "globalBlock", "")))
      .filter((id) => id !== "");

    if (partialBlockIds.length === 0) {
      return blocks;
    }

    // Fetch all partial blocks in ONE query
    const { data: partialResults, error: partialError } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          blocks: table.blocks,
        })
        .from(table)
        .where(and(eq(table.app, appId), inArray(table.id, partialBlockIds))),
    );

    if (partialError) {
      throw apiError("PARTIAL_BLOCKS_FETCH_ERROR", partialError);
    }

    // Create a map for quick lookup: { partialBlockId: blocks[] }
    const partialBlocksMap = new Map<string, ChaiBlock[]>();
    if (partialResults) {
      partialResults.forEach((result) => {
        partialBlocksMap.set(result.id, (result.blocks as ChaiBlock[]) ?? []);
      });
    }

    // Replace partial blocks with their actual content
    for (let i = 0; i < partialBlocksList.length; i++) {
      const partialBlock = partialBlocksList[i];
      if (!partialBlock) continue;

      const partialBlockId = get(partialBlock, "partialBlockId", get(partialBlock, "globalBlock", ""));
      if (partialBlockId === "") continue;

      let partialBlocks = partialBlocksMap.get(partialBlockId) ?? [];

      // Inherit parent properties
      if (partialBlocks.length > 0) {
        partialBlocks = partialBlocks.map((block) => {
          if (isEmpty(block._parent)) block._parent = partialBlock._parent;
          if (has(partialBlock, "_show")) block._show = partialBlock._show;
          return block;
        });
      }

      // Replace the reference with actual content
      const index = blocks.indexOf(partialBlock);
      if (index !== -1) {
        blocks.splice(index, 1, ...partialBlocks);
      }
    }

    return blocks;
  }
}
