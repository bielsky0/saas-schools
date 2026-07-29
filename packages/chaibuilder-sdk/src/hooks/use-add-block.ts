import { filter, find, first, forEach, has } from "lodash-es";
import { useCallback } from "react";
import { canAcceptChildBlock } from "~/core/functions/block-helpers";
import { generateUUID } from "~/core/functions/common-functions";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { getBlockDefaultProps } from "~/runtime";
import { ChaiBlock, ChaiCoreBlock } from "~/types/common";

// Delay before selecting a newly added block to ensure the block is rendered in the DOM
// and the state has been updated before attempting to highlight it
const BLOCK_SELECTION_DELAY_MS = 100;

type AddBlocks = {
  addCoreBlock: any;
  addPredefinedBlock: any;
};

export const useAddBlock = (): AddBlocks => {
  const [allBlocks] = useBlocksStore();
  const [, setSelected] = useSelectedBlockIds();
  const { addBlocks } = useBlocksStoreUndoableActions();

  const addPredefinedBlock = useCallback(
    (blocks: ChaiBlock[], parentId?: string, position?: number) => {
      for (let i = 0; i < blocks.length; i++) {
        const { _id } = blocks[i];

        blocks[i]._id = generateUUID();
        const children = filter(blocks, { _parent: _id });
        for (let j = 0; j < children.length; j++) {
          children[j]._parent = blocks[i]._id;
        }
      }
      const block = first(blocks)!;
      let parentBlock;
      let parentBlockId;
      if (parentId) {
        parentBlock = find(allBlocks, { _id: parentId }) as ChaiBlock;
        blocks[0]._parent = parentId;
        forEach(blocks, (block) => {
          if (!block?._parent) block._parent = parentId;
        });
        parentBlockId = parentId;
      }

      const canAdd = parentBlock ? canAcceptChildBlock(parentBlock?._type, block._type) : true;
      if (!canAdd && parentBlock) {
        blocks[0]._parent = parentBlock._parent;
        parentBlockId = parentBlock._parent;
      }

      addBlocks(blocks, parentBlockId ?? undefined, position);
      setSelected([block._id]);
      return block;
    },
    [addBlocks, allBlocks, setSelected],
  );

  const addCoreBlock = useCallback(
    (coreBlock: ChaiCoreBlock, parentId?: string | null, position?: number) => {
      if (has(coreBlock, "blocks")) {
        const blocks = coreBlock.blocks as ChaiBlock[];
        return addPredefinedBlock(blocks, parentId ?? undefined, position);
      }

      const blockId = generateUUID();
      const props: { [key: string]: any } = getBlockDefaultProps(coreBlock.type);

      const newBlock: ChaiBlock = {
        _type: coreBlock.type,
        _id: blockId,
        ...props,
        ...(has(coreBlock, "_name") && { _name: coreBlock._name }),
        ...(has(coreBlock, "partialBlockId") && {
          partialBlockId: coreBlock.partialBlockId,
        }),
      };
      let parentBlock;
      let parentBlockId;
      if (parentId) {
        parentBlock = find(allBlocks, { _id: parentId }) as ChaiBlock;
        newBlock._parent = parentId;
        parentBlockId = parentId;
      }

      const canAdd = parentBlock ? canAcceptChildBlock(parentBlock._type, newBlock._type) : true;
      if (!canAdd && parentBlock) {
        newBlock._parent = parentBlock._parent;
        parentBlockId = parentBlock._parent;
      }
      const newBlocks: ChaiBlock[] = [newBlock];

      addBlocks(newBlocks, parentBlockId ?? undefined, position);
      setTimeout(() => setSelected([newBlock._id]), BLOCK_SELECTION_DELAY_MS);
      return newBlock;
    },
    [addBlocks, addPredefinedBlock, allBlocks, setSelected],
  );

  return { addCoreBlock, addPredefinedBlock };
};
