import { CORE_BLOCK_TYPES, isRegisteredBlock } from "./block-configs";

const MAX_DEPTH = 10;

export function validateBlockAccess(
  blocks: unknown[],
  grantedKeys: Set<string>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  function walk(list: unknown[], depth: number) {
    if (depth > MAX_DEPTH) {
      errors.push(`Max nesting depth of ${MAX_DEPTH} exceeded`);
      return;
    }

    if (!Array.isArray(list)) {
      errors.push("Blocks must be an array");
      return;
    }

    for (const block of list) {
      if (!block || typeof block !== "object") {
        errors.push("Invalid block entry");
        continue;
      }

      const b = block as Record<string, unknown>;
      const blockType = b.blockType;

      if (!blockType || typeof blockType !== "string") {
        errors.push("Block missing blockType");
        continue;
      }

      if (!isRegisteredBlock(blockType)) {
        errors.push(`Unknown block type "${blockType}"`);
        continue;
      }

      if (!CORE_BLOCK_TYPES.has(blockType) && !grantedKeys.has(blockType)) {
        errors.push(`Block "${blockType}" requires a grant`);
        continue;
      }

      const cells = b.cells;
      if (Array.isArray(cells)) {
        for (const cell of cells) {
          if (cell && typeof cell === "object") {
            const cellBlocks = (cell as Record<string, unknown>).blocks;
            if (Array.isArray(cellBlocks)) {
              walk(cellBlocks, depth + 1);
            }
          }
        }
      }

      const nestedBlocks = b.blocks;
      if (Array.isArray(nestedBlocks)) {
        walk(nestedBlocks, depth + 1);
      }

      const items = b.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && typeof item === "object") {
            const itemContent = (item as Record<string, unknown>).contentBlocks;
            if (Array.isArray(itemContent)) {
              walk(itemContent, depth + 1);
            }
          }
        }
      }
    }
  }

  walk(blocks, 0);
  return { valid: errors.length === 0, errors };
}
