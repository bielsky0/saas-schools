import { db, safeQuery, schema } from "@chaibuilder/sdk/actions";
import { ChaiBlock, ChaiPage } from "@chaibuilder/sdk/types";
import { and, eq, inArray } from "drizzle-orm";
import { get, has, isEmpty } from "lodash";
import { nanoid } from "nanoid";

/**
 * Maximum nesting depth for partial blocks.
 * Prevents infinite recursion when partials contain other partials.
 * Set to 4 to balance flexibility with performance and safety.
 */
const MAX_PARTIAL_DEPTH = 4;

export type GetFullPageOptions = {
  id: string;
  draft: boolean;
  mergeGlobal?: boolean;
  mergePartials?: boolean;
  editor?: boolean;
  userId?: string;
};

export function assignNewIds(blocks: ChaiBlock[]): ChaiBlock[] {
  const idMap = new Map<string, string>();

  // Generate new IDs for all blocks
  blocks.forEach((block) => {
    idMap.set(block._id, nanoid());
  });

  // Create new blocks with updated _id and _parent references
  return blocks.map((block) => ({
    ...block,
    _id: idMap.get(block._id)!,
    _parent: block._parent ? (idMap.get(block._parent) ?? block._parent) : block._parent,
  }));
}

export async function getFullPage(
  pageId: string,
  appId: string,
  draftMode: boolean,
  options: Partial<GetFullPageOptions> = {},
): Promise<
  Pick<
    ChaiPage,
    | "id"
    | "name"
    | "slug"
    | "lang"
    | "primaryPage"
    | "seo"
    | "currentEditor"
    | "pageType"
    | "lastSaved"
    | "dynamic"
    | "parent"
    | "blocks"
  >
> {
  const table = draftMode ? schema.appPages : schema.appPagesOnline;

  // Get page data with selected fields
  const { data: pageResult, error } = await safeQuery(() =>
    db
      .select({
        id: table.id,
        name: table.name,
        slug: table.slug,
        lang: table.lang,
        primaryPage: table.primaryPage,
        seo: table.seo,
        currentEditor: table.currentEditor,
        pageType: table.pageType,
        lastSaved: table.lastSaved,
        dynamic: table.dynamic,
        parent: table.parent,
      })
      .from(table)
      .where(and(eq(table.app, appId), eq(table.id, pageId)))
      .limit(1),
  );

  if (error || !pageResult || pageResult.length === 0) {
    throw new Error("PAGE_NOT_FOUND");
  }

  const page = pageResult[0];
  if (!page) {
    throw new Error("PAGE_NOT_FOUND");
  }

  const primaryPageId = page.primaryPage ?? page.id;

  // Get blocks from the primary page
  const { data: blocksResult, error: blocksError } = await safeQuery(() =>
    db
      .select({
        blocks: table.blocks,
      })
      .from(table)
      .where(and(eq(table.app, appId), eq(table.id, primaryPageId)))
      .limit(1),
  );

  if (blocksError) {
    throw new Error("FAILED_TO_FETCH_PAGE_BLOCKS");
  }

  let blocks = (blocksResult?.[0]?.blocks as ChaiBlock[]) ?? [];

  // Merge partials if requested
  const shouldMergePartials = options.mergeGlobal ?? options.mergePartials ?? false;
  if (shouldMergePartials) {
    blocks = await getMergedBlocks(blocks, draftMode, appId);
  }

  // Handle editor locking for draft pages
  let currentEditor = page.currentEditor;

  return {
    id: pageId,
    name: page.name,
    slug: page.slug,
    lang: page.lang,
    primaryPage: page.primaryPage,
    seo: page.seo ?? {},
    currentEditor,
    pageType: page.pageType!,
    lastSaved: page.lastSaved!,
    dynamic: page.dynamic!,
    parent: page.parent,
    blocks,
  };
}

/**
 * Extract partial block IDs from a list of blocks
 */
function extractPartialBlockIds(blocks: ChaiBlock[]): string[] {
  return blocks
    .filter(({ _type }) => _type === "GlobalBlock" || _type === "PartialBlock")
    .map((block) => get(block, "partialBlockId", get(block, "globalBlock", "")))
    .filter((id) => id !== "");
}

/**
 * Merge partial blocks into the main blocks array
 * Fetches nested partials up to MAX_PARTIAL_DEPTH levels
 * Optimized to batch fetch all partials at each depth level in a single query
 */
async function getMergedBlocks(blocks: ChaiBlock[], draft: boolean, appId: string): Promise<ChaiBlock[]> {
  const table = draft ? schema.appPages : schema.appPagesOnline;

  // Map to store all fetched partial blocks: { partialBlockId: blocks[] }
  const partialBlocksMap = new Map<string, ChaiBlock[]>();
  const fetchedIds = new Set<string>();

  // Collect initial partial IDs from page blocks
  let idsToFetch = extractPartialBlockIds(blocks).filter((id) => !fetchedIds.has(id));

  // Fetch partials level by level up to MAX_PARTIAL_DEPTH
  for (let depth = 0; depth < MAX_PARTIAL_DEPTH && idsToFetch.length > 0; depth++) {
    // Batch fetch all partials at this depth in ONE query
    const { data: partialResults } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          blocks: table.blocks,
        })
        .from(table)
        .where(and(eq(table.app, appId), inArray(table.id, idsToFetch))),
    );

    // Store results and collect nested partial IDs for next iteration
    const nextLevelIds: string[] = [];
    if (partialResults) {
      partialResults.forEach((result: { id: string; blocks: unknown }) => {
        const partialBlocks = (result.blocks as ChaiBlock[]) ?? [];
        partialBlocksMap.set(result.id, partialBlocks);
        fetchedIds.add(result.id);

        // Extract nested partial IDs for next depth level
        const nestedIds = extractPartialBlockIds(partialBlocks);
        nestedIds.forEach((id) => {
          if (!fetchedIds.has(id) && !nextLevelIds.includes(id)) {
            nextLevelIds.push(id);
          }
        });
      });
    }

    // Mark requested IDs as fetched even if not found (to avoid re-fetching)
    idsToFetch.forEach((id) => fetchedIds.add(id));
    idsToFetch = nextLevelIds;
  }

  // Now replace all partial blocks with their content (recursive replacement)
  return replacePartialBlocks(blocks, partialBlocksMap);
}

/**
 * Recursively replace partial blocks with their content
 * @param blocks - The blocks to process
 * @param partialBlocksMap - Map of partial block IDs to their content blocks
 * @param visited - Set of partial IDs currently being expanded (for cycle detection)
 * @param depth - Current recursion depth (for depth limiting)
 */
function replacePartialBlocks(
  blocks: ChaiBlock[],
  partialBlocksMap: Map<string, ChaiBlock[]>,
  visited: Set<string> = new Set(),
  depth: number = 0,
): ChaiBlock[] {
  // Guard against excessive recursion depth
  if (depth >= MAX_PARTIAL_DEPTH) {
    return blocks;
  }

  const result: ChaiBlock[] = [];

  for (const block of blocks) {
    if (block._type === "GlobalBlock" || block._type === "PartialBlock") {
      const partialBlockId = get(block, "partialBlockId", get(block, "globalBlock", ""));
      if (partialBlockId === "") {
        result.push(block);
        continue;
      }

      // Guard against circular references
      if (visited.has(partialBlockId)) {
        // Circular reference detected - skip expansion and keep the original block
        result.push(block);
        continue;
      }

      let partialBlocks = partialBlocksMap.get(partialBlockId) ?? [];
      if (partialBlocks.length === 0) {
        result.push(block);
        continue;
      }

      // Generate new IDs for blocks
      partialBlocks = assignNewIds(partialBlocks);

      // Inherit parent properties
      partialBlocks = partialBlocks.map((b) => {
        if (isEmpty(b._parent)) b._parent = block._parent;
        if (has(block, "_show")) b._show = block._show;
        return b;
      });

      // Add current partial to visited set for cycle detection
      const newVisited = new Set(visited);
      newVisited.add(partialBlockId);

      // Recursively replace nested partials within this partial's blocks
      const expandedBlocks = replacePartialBlocks(partialBlocks, partialBlocksMap, newVisited, depth + 1);
      result.push(...expandedBlocks);
    } else {
      result.push(block);
    }
  }

  return result;
}
