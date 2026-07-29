import {
  closestBlockProp,
  getAIBlockProps,
  getBlockDefaultProps,
  getBlockFormSchemas,
  getDefaultBlockProps,
  getI18nBlockProps,
  getRegisteredChaiBlock,
  registerChaiBlock,
  registerChaiServerBlock,
  setChaiBlockComponent,
  setChaiServerBlockDataProvider,
  syncBlocksWithDefaultProps,
  syncBlocksWithDefaults,
  useRegisteredChaiBlock,
  useRegisteredChaiBlocks,
} from "./core";

export * from "../../fonts";

const setChaiBlockDataProvider = setChaiServerBlockDataProvider;

export {
  closestBlockProp,
  getAIBlockProps,
  getBlockDefaultProps,
  getBlockFormSchemas,
  getDefaultBlockProps,
  getI18nBlockProps,
  // getters
  getRegisteredChaiBlock,
  // functions
  registerChaiBlock,
  registerChaiServerBlock,
  setChaiBlockComponent,
  setChaiBlockDataProvider,
  setChaiServerBlockDataProvider,
  // helpers
  syncBlocksWithDefaultProps,
  syncBlocksWithDefaults,
  // hooks
  useRegisteredChaiBlock,
  useRegisteredChaiBlocks,
};
