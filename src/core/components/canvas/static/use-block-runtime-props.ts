import { find, get, isEmpty } from "lodash-es";
import { useCallback } from "react";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { ChaiBlock } from "~/types/common";

export const useBlockRuntimeProps = () => {
  const [allBlocks] = useBlocksStore();
  return useCallback(
    (blockId: string, runtimeProps: Record<string, any>) => {
      if (isEmpty(runtimeProps)) return {};
      return Object.entries(runtimeProps).reduce(
        (acc: Record<string, any>, [key, schema]) => {
          const hierarchy = [];
          let block = find(allBlocks, { _id: blockId }) as ChaiBlock | undefined;
          while (block) {
            hierarchy.push(block);
            block = find(allBlocks, { _id: block._parent }) as ChaiBlock | undefined;
          }
          const matchingBlock = find(hierarchy, { _type: schema.block });
          if (matchingBlock) {
            acc[key] = get(matchingBlock, get(schema, "prop"), null);
          }
          return acc;
        },
        {} as Record<string, any>,
      );
    },
    [allBlocks],
  );
};
