import { find } from "lodash-es";
import { useCallback } from "react";
import { presentBlocksAtom } from "~/atoms/blocks";
import { builderStore } from "~/atoms/store";
import { PERMISSIONS } from "~/core/main";
import { useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { usePermissions } from "~/hooks/use-permissions";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { ChaiBlock } from "~/types/common";

/**
 * Recursively collects all descendant block IDs for a given parent ID
 */
const getAllDescendantIds = (blocks: ChaiBlock[], parentId: string): string[] => {
  const directChildren = blocks.filter((block) => block._parent === parentId);
  const childIds = directChildren.map((child) => child._id);

  // Recursively get descendants of each child
  const descendantIds = directChildren.flatMap((child) => getAllDescendantIds(blocks, child._id));

  return [...childIds, ...descendantIds];
};

export const replaceBlock = (blocks: ChaiBlock[], blockId: string, replacementBlocks: ChaiBlock[]): ChaiBlock[] => {
  // Find the block to be replaced
  const blockToReplace = find(blocks, { _id: blockId });
  if (!blockToReplace) return blocks;

  // Step 1: Get the position of the block to remove
  const blockIndex = blocks.findIndex((block) => block._id === blockId);

  // Step 2: Get IDs of all nested child blocks
  const descendantIds = getAllDescendantIds(blocks, blockId);
  const idsToRemove = new Set([blockId, ...descendantIds]);

  // Step 3: Remove all the blocks by IDs
  const blocksWithoutRemoved = blocks.filter((block) => !idsToRemove.has(block._id));

  // Step 4: Change the _parent of root-level replacement blocks
  // Root-level blocks are those whose parent is not in the replacement set
  const replacementBlockIds = new Set(replacementBlocks.map((b) => b._id));
  const updatedReplacementBlocks = replacementBlocks.map((block) => {
    const isRootLevel = !block._parent || !replacementBlockIds.has(block._parent);
    return isRootLevel ? { ...block, _parent: blockToReplace._parent } : block;
  });

  // Step 5: Insert at the position
  const result = [
    ...blocksWithoutRemoved.slice(0, blockIndex),
    ...updatedReplacementBlocks,
    ...blocksWithoutRemoved.slice(blockIndex),
  ];

  return result;
};

export const useReplaceBlock = () => {
  const [, setSelectedIds] = useSelectedBlockIds();
  const { setNewBlocks } = useBlocksStoreUndoableActions();
  const { hasPermission } = usePermissions();

  return useCallback(
    (blockId: string | undefined, replacementBlocks: ChaiBlock[]) => {
      if (!hasPermission(PERMISSIONS.EDIT_BLOCK)) return;
      const latestUpdatedBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
      const newBlocks = blockId ? replaceBlock(latestUpdatedBlocks, blockId, replacementBlocks) : replacementBlocks;
      setNewBlocks(newBlocks);
      // Select the first replacement block after replace
      if (replacementBlocks.length > 0) {
        setTimeout(() => setSelectedIds([replacementBlocks[0]._id]), 200);
      }
    },
    [setSelectedIds, setNewBlocks, hasPermission],
  );
};
