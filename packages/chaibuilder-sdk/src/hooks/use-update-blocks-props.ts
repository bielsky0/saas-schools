import { chunk, forEach, get, includes, isEmpty, isString, keys, omit, set, unset } from "lodash-es";
import { useCallback } from "react";
import { useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlock } from "~/types/common";

const updatePropsForLanguage = (props: Record<string, any>, selectedLang: string, selectedBlock?: ChaiBlock) => {
  const chaiBlock = getRegisteredChaiBlock(get(selectedBlock, "_type", ""));
  if (!chaiBlock) return props;

  const updatedProps = { ...props };
  forEach(keys(props), (key) => {
    if (includes(get(chaiBlock, "i18nProps", []), key) && !isEmpty(selectedLang)) {
      const _key = `${key}-${selectedLang}`;
      set(updatedProps, _key, props[key]);
      unset(updatedProps, key);
    }
  });
  return updatedProps;
};

/**
 *
 */
export const useUpdateBlocksProps = () => {
  const { updateBlocks } = useBlocksStoreUndoableActions();
  const { selectedLang } = useLanguages();
  const selectedBlock = useSelectedBlock();

  return useCallback(
    (blockIds: Array<string>, props: Record<string, any>, prevPropsState?: Record<string, any>) => {
      const updatedProps = updatePropsForLanguage(props, selectedLang, selectedBlock);
      updateBlocks(blockIds, updatedProps, prevPropsState);
    },
    [selectedLang, selectedBlock, updateBlocks],
  );
};

export const useUpdateMultipleBlocksProps = () => {
  const { updateMultipleBlocksProps } = useBlocksStoreUndoableActions();
  return useCallback(
    (blocks: Array<{ _id: string } & Partial<ChaiBlock>>) => {
      updateMultipleBlocksProps(blocks);
    },
    [updateMultipleBlocksProps],
  );
};

/**
 *
 */
const useFakeStreamEffect = () => {
  const { updateBlocksRuntime } = useBlocksStoreUndoableActions();
  return useCallback(
    async (id: string, block: Partial<ChaiBlock>, delay = 30) => {
      const props = keys(omit(block, ["_id"]));
      for (const prop of props) {
        const value = block[prop];
        if (isString(value)) {
          const letters = chunk(value.split(""), 12);
          let str = "";
          updateBlocksRuntime([id], { [prop]: "" });
          for (let i = 0; i < letters.length; i++) {
            str += letters[i].join("");
            updateBlocksRuntime([id], { [prop]: str });
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    },
    [updateBlocksRuntime],
  );
};

export const useStreamMultipleBlocksProps = () => {
  const { updateMultipleBlocksProps } = useBlocksStoreUndoableActions();
  const streamEffect = useFakeStreamEffect();
  return useCallback(
    async (blocks: Array<{ _id: string } & Partial<ChaiBlock>>) => {
      for (const block of blocks) {
        await streamEffect(block._id, block);
      }
      updateMultipleBlocksProps(blocks);
    },
    [streamEffect, updateMultipleBlocksProps],
  );
};

export const useUpdateBlocksPropsRealtime = () => {
  const { updateBlocksRuntime } = useBlocksStoreUndoableActions();
  const { selectedLang } = useLanguages();
  const selectedBlock = useSelectedBlock();

  return useCallback(
    (blockIds: Array<string>, props: Record<string, any>) => {
      const updatedProps = updatePropsForLanguage(props, selectedLang, selectedBlock);
      updateBlocksRuntime(blockIds, updatedProps);
    },
    [selectedLang, selectedBlock, updateBlocksRuntime],
  );
};
