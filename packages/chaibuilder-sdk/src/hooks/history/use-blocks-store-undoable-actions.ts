import { useAtom } from "jotai";
import { each, first, keys, map } from "lodash-es";
import { presentBlocksAtom } from "~/atoms/blocks";
import { builderStore } from "~/atoms/store";
import { useBlocksStoreManager } from "~/hooks/history/use-blocks-store-manager";
import { useUndoManager } from "~/hooks/history/use-undo-manager";
import { ChaiBlock } from "~/types/common";

export const useBlocksStore = () => {
  return useAtom(presentBlocksAtom);
};

export const useBlocksStoreUndoableActions = () => {
  const { add } = useUndoManager();
  const {
    setNewBlocks: setBlocks,
    addBlocks: addNewBlocks,
    removeBlocks: removeExistingBlocks,
    moveBlocks: moveExistingBlocks,
    updateBlocksProps,
  } = useBlocksStoreManager();

  const setNewBlocks = (newBlocks: ChaiBlock[]) => {
    const previousBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    setBlocks(newBlocks);
    add({
      undo: () => setBlocks(previousBlocks),
      redo: () => setBlocks(newBlocks),
    });
  };

  const addBlocks = (newBlocks: ChaiBlock[], parent?: string, position?: number) => {
    addNewBlocks(newBlocks, parent, position);
    add({
      undo: () => removeExistingBlocks(map(newBlocks, "_id")),
      redo: () => addNewBlocks(newBlocks, parent, position),
    });
  };

  const removeBlocks = (blocks: ChaiBlock[]) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    const parentId = first(blocks)?._parent;
    const siblings = latestBlocks.filter((block) => (parentId ? block._parent === parentId : !block._parent));
    const position = siblings.indexOf(first(blocks) as ChaiBlock);

    removeExistingBlocks(map(blocks, "_id"));
    add({
      undo: () => addNewBlocks(blocks, parentId ?? undefined, position),
      redo: () => removeExistingBlocks(map(blocks, "_id")),
    });
  };

  const moveBlocks = (blockIds: string[], parent: string | undefined, position: number) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    // Save the current positions of the blocks for undo
    const currentPositions = map(blockIds, (_id: string) => {
      const block = latestBlocks.find((block) => block._id === _id) as ChaiBlock;
      const oldParent = block._parent || null;
      const siblings = latestBlocks
        .filter((block) => (oldParent ? block._parent === oldParent : !block._parent))
        .map((block) => block._id);
      const oldPosition = siblings.indexOf(_id);
      return { _id, oldParent, oldPosition };
    });

    //if the parent and position are the same as the current parent and position, do nothing
    const firstBlock = currentPositions.find(({ _id }) => _id === blockIds[0]);
    if (firstBlock && firstBlock.oldParent === parent && firstBlock.oldPosition === position) {
      return;
    }

    moveExistingBlocks(blockIds, parent ?? null, position);
    add({
      undo: () =>
        each(currentPositions, ({ _id, oldParent, oldPosition }) => {
          moveExistingBlocks([_id], oldParent ?? null, oldPosition);
        }),
      redo: () => moveExistingBlocks(blockIds, parent ?? null, position),
    });
  };

  const updateBlocks = (blockIds: string[], props: Partial<ChaiBlock>, oldPropsState?: Partial<ChaiBlock>) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    let previousPropsState = [];
    if (oldPropsState) {
      previousPropsState = map(blockIds, (_id: string) => {
        return { _id, ...oldPropsState };
      });
    } else {
      const propKeys = keys(props);
      previousPropsState = map(blockIds, (_id: string) => {
        const block = latestBlocks.find((block) => block._id === _id) as ChaiBlock;
        const prevProps: Record<string, any> = { _id };
        each(propKeys, (key: string) => (prevProps[key] = block[key]));
        return prevProps;
      });
    }

    updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props })));
    add({
      undo: () => updateBlocksProps(previousPropsState as Array<{ _id: string } & Partial<ChaiBlock>>),
      redo: () => updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props }))),
    });
  };

  const updateMultipleBlocksProps = (blocks: Array<{ _id: string } & Partial<ChaiBlock>>) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    let previousPropsState = [];
    previousPropsState = map(blocks, (block: Partial<ChaiBlock>) => {
      const propKeys = keys(block);
      const currentBlock = latestBlocks.find((currentBlock) => currentBlock._id === block._id);
      const prevProps: Record<string, any> = {};
      each(propKeys, (key: string) => (prevProps[key] = currentBlock?.[key]));
      return prevProps;
    });

    updateBlocksProps(blocks);
    add({
      undo: () => updateBlocksProps(previousPropsState as Array<{ _id: string } & Partial<ChaiBlock>>),
      redo: () => updateBlocksProps(blocks),
    });
  };

  const updateBlocksRuntime = (blockIds: string[], props: Record<string, any>) => {
    updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props })));
  };

  return {
    moveBlocks,
    addBlocks,
    removeBlocks,
    updateBlocks,
    updateBlocksRuntime,
    setNewBlocks,
    updateMultipleBlocksProps,
  };
};
