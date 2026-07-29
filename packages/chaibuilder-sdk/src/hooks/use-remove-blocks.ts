import { filter, find, includes, isEmpty } from "lodash-es";
import { useCallback } from "react";
import { PERMISSIONS } from "~/core/main";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { usePermissions } from "~/hooks/use-permissions";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { ChaiBlock } from "~/types/common";
export const removeNestedBlocks = (blocks: ChaiBlock[], blockIds: Array<string>): ChaiBlock[] => {
  // Create a copy of blocks to modify
  let modifiedBlocks = [...blocks];
  const additionalBlocksToRemove: string[] = [];

  // For each block being removed, check its parent
  blockIds.forEach((blockId) => {
    const blockToRemove = modifiedBlocks.find((block) => block._id === blockId);
    if (!blockToRemove || !blockToRemove._parent) return;

    const parentId = blockToRemove._parent;

    // Get all children of the parent
    const parentChildren = modifiedBlocks.filter((block) => block._parent === parentId);

    // Check if parent has exactly two children
    if (parentChildren.length === 2) {
      // Find the other child (not the one being removed)
      const otherChild = parentChildren.find((child) => child._id !== blockId);

      // Check if the other child is a Text block
      if (otherChild && otherChild._type === "Text") {
        // Get the parent block
        const parentBlock = modifiedBlocks.find((block) => block._id === parentId);

        if (parentBlock && "content" in parentBlock) {
          // Copy content and content- properties from Text block to parent
          modifiedBlocks = modifiedBlocks.map((block) => {
            if (block._id === parentId) {
              // Create updated parent with content from Text block
              const updatedBlock = { ...block, content: otherChild.content };

              // Copy any content- properties
              Object.keys(otherChild).forEach((key) => {
                if (key.startsWith("content-")) {
                  (updatedBlock as any)[key] = otherChild[key];
                }
              });

              return updatedBlock;
            }
            return block;
          });

          // Add the Text block to the list of blocks to remove
          additionalBlocksToRemove.push(otherChild._id);
        }
      }
    }
  });

  // Combine original blockIds with additional blocks to remove
  const allBlocksToRemove = [...blockIds, ...additionalBlocksToRemove];

  // Continue with the original removal logic
  const _blockIds: Array<string> = [];
  const _blocks = filter(modifiedBlocks, (block: ChaiBlock) => {
    if (includes(allBlocksToRemove, block._id) || includes(allBlocksToRemove, block._parent)) {
      _blockIds.push(block._id);
      return false;
    }
    return true;
  });

  if (!isEmpty(_blockIds)) return removeNestedBlocks(_blocks, _blockIds);
  return _blocks;
};

export const useRemoveBlocks = () => {
  const [presentBlocks] = useBlocksStore();
  const [, setSelectedIds] = useSelectedBlockIds();
  const { setNewBlocks } = useBlocksStoreUndoableActions();
  const { hasPermission } = usePermissions();

  return useCallback(
    (blockIds: Array<string>) => {
      if (!hasPermission(PERMISSIONS.DELETE_BLOCK)) return;
      const parentBlockId = find(presentBlocks, { _id: blockIds[0] })?._parent || null;
      setNewBlocks(removeNestedBlocks(presentBlocks, blockIds));
      setTimeout(() => setSelectedIds(parentBlockId ? [parentBlockId] : []), 200);
    },
    [hasPermission, presentBlocks, setNewBlocks, setSelectedIds],
  );
};
