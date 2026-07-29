import { each, find, omit } from "lodash-es";
import { useIncrementActionsCount } from "~/core/components/use-auto-save";
import { insertBlocksAtPosition } from "~/hooks/history/insert-block-at-position";
import { moveBlocksWithChildren } from "~/hooks/history/move-blocks-with-children";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBroadcastChannel } from "~/hooks/use-broadcast-channel";
import { useCheckStructure } from "~/hooks/use-check-structure";
import { removeNestedBlocks } from "~/hooks/use-remove-blocks";
import { useUpdateBlockAtom } from "~/hooks/use-update-block-atom";
import { ChaiBlock } from "~/types/common";

export const useBlocksStoreManager = () => {
  const [, setBlocks] = useBlocksStore();
  const { postMessage } = useBroadcastChannel();
  const updateBlockAtom = useUpdateBlockAtom();
  const runValidation = useCheckStructure();
  const incrementActionsCount = useIncrementActionsCount();
  return {
    setNewBlocks: (newBlocks: ChaiBlock[]) => {
      setBlocks(newBlocks);
      postMessage({ type: "blocks-updated", blocks: newBlocks });
    },
    addBlocks: (newBlocks: ChaiBlock[], parent?: string, position?: number) => {
      setBlocks((prevBlocks) => {
        const blocks = insertBlocksAtPosition(prevBlocks, newBlocks, parent, position);
        postMessage({ type: "blocks-updated", blocks });
        runValidation(blocks);
        incrementActionsCount();
        return blocks;
      });
    },
    removeBlocks: (blockIds: string[]) => {
      setBlocks((prevBlocks) => {
        const blocks = removeNestedBlocks(prevBlocks, blockIds);
        postMessage({ type: "blocks-updated", blocks });
        runValidation(blocks);
        incrementActionsCount();
        return blocks;
      });
    },
    moveBlocks: (blockIds: string[], newParent: string | null, position: number) => {
      setBlocks((prevBlocks) => {
        let blocks = [...prevBlocks];
        for (let i = 0; i < blockIds.length; i++) {
          blocks = moveBlocksWithChildren(blocks, blockIds[i], newParent, position);
        }
        each(blockIds, (id: string) => {
          const block = find(blocks, (b) => b._id === id);
          if (block) {
            updateBlockAtom({ id, props: { _parent: block._parent || null } });
          }
        });
        postMessage({ type: "blocks-updated", blocks });
        runValidation(blocks);
        incrementActionsCount();
        return blocks;
      });
    },
    updateBlocksProps: (blocks: (Partial<ChaiBlock> & { _id: string })[]) => {
      blocks.forEach((block) => {
        const updatedBlock = omit(block, "_id");
        updateBlockAtom({ id: block._id, props: updatedBlock });
      });
      postMessage({ type: "blocks-props-updated", blocks });
      incrementActionsCount();
    },
  };
};
