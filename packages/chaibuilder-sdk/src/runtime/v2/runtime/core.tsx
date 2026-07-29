import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { cloneDeep, each, get, has, omitBy, set } from "lodash-es";
import React, { useMemo } from "react";
import type { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlockComponentProps } from "~/types/blocks.ts";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import { ChaiBlockPropsSchema } from "~/types/common.ts";

const REGISTERED_CHAI_BLOCKS: Record<
  string,
  ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> }
> = {};

export const useRegisteredChaiBlocks = () => {
  return REGISTERED_CHAI_BLOCKS;
};

export const useRegisteredChaiBlock = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return useMemo(() => get(REGISTERED_CHAI_BLOCKS, type, null), [type]);
};

export const getRegisteredChaiBlock = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
): (ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> }) | undefined => {
  return get(REGISTERED_CHAI_BLOCKS, type);
};

export const getDefaultBlockProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  console.warn("getDefaultBlockProps is deprecated. Use getBlockDefaultProps instead.");
  return getBlockDefaultProps(type);
};

export const getBlockDefaultProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  const registeredBlock = get(REGISTERED_CHAI_BLOCKS, type);
  const schema = registeredBlock?.props?.schema || (registeredBlock?.schema ?? {});
  const properties = get(schema, "properties", {});
  const defaultProps: Record<string, any> = {};
  each(properties, (propSchema: ChaiBlockPropsSchema, key) => {
    if (has(propSchema, "block")) {
      return;
    }
    set(defaultProps, key, propSchema.default);
  });
  return defaultProps;
};

export const getI18nBlockProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  console.warn("getI18nBlockProps is deprecated. Use getBlockI18nProps instead.");
  return get(REGISTERED_CHAI_BLOCKS, `${type}.i18nProps`, []);
};

export const getBlockI18nProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return get(REGISTERED_CHAI_BLOCKS, `${type}.i18nProps`, []);
};

export const getAIBlockProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  console.warn("getAIBlockProps is deprecated. Use getBlockAIProps instead.");
  return get(REGISTERED_CHAI_BLOCKS, `${type}.aiProps`, []);
};
export const getBlockAIProps = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return get(REGISTERED_CHAI_BLOCKS, `${type}.aiProps`, []);
};

export const getBlockFormSchemas = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
): { schema: RJSFSchema; uiSchema: UiSchema } | undefined => {
  const registeredBlock = getRegisteredChaiBlock(type);
  if (!registeredBlock) {
    return undefined;
  }
  const blockSchema = registeredBlock.props?.schema || (registeredBlock.schema ?? {});
  const blockUiSchema = registeredBlock.props?.uiSchema || (registeredBlock.uiSchema ?? {});
  const schema = cloneDeep(blockSchema) as RJSFSchema;
  const properties = get(schema, "properties", {}) as Record<string, any>;
  const nonStylesProperties = omitBy(properties, (prop) => prop?.styles === true);
  set(schema, "properties", nonStylesProperties);
  const uiSchema = blockUiSchema || {};
  return { schema, uiSchema };
};

export const syncBlocksWithDefaults = (blocks: ChaiBlock[]): ChaiBlock[] => {
  console.warn("syncBlocksWithDefaults is deprecated. Use syncBlocksWithDefaultProps instead.");
  return syncBlocksWithDefaultProps(blocks);
};

export const syncBlocksWithDefaultProps = (blocks: ChaiBlock[]): ChaiBlock[] => {
  return blocks.map((block) => {
    if (has(REGISTERED_CHAI_BLOCKS, block._type)) {
      const defaults = getBlockDefaultProps(block._type);
      return { ...defaults, ...block } as ChaiBlock;
    }
    return block;
  });
};

const registerInternalBlock = (component: React.ComponentType<ChaiBlockComponentProps>, options: ChaiBlockConfig) => {
  const existingBlock = get(REGISTERED_CHAI_BLOCKS, options.type);
  if (existingBlock) {
    set(REGISTERED_CHAI_BLOCKS, options.type, { ...existingBlock, component, ...options });
  } else {
    set(REGISTERED_CHAI_BLOCKS, options.type, { component, ...options });
  }
};

export const registerChaiBlock = (
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
  options: ChaiBlockConfig,
) => {
  registerInternalBlock(component, { ...options, ...{ category: options.category || "core" } });
};

export const registerChaiServerBlock = (
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
  options: Pick<ChaiBlockConfig, "type" | "dataProvider" | "i18nProps" | "aiProps">,
) => {
  const existingBlock = get(REGISTERED_CHAI_BLOCKS, options.type);
  if (existingBlock) {
    set(REGISTERED_CHAI_BLOCKS, options.type, { ...existingBlock, component, ...options });
  } else {
    set(REGISTERED_CHAI_BLOCKS, options.type, { component, ...options });
  }
};

export const setChaiServerBlockDataProvider = <K extends Record<string, any> = Record<string, any>>(
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
  dataProvider: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    block: ChaiBlock<K>;
    pageProps: ChaiPageProps;
  }) => Promise<K>,
) => {
  const registeredBlock = getRegisteredChaiBlock(type);
  set(REGISTERED_CHAI_BLOCKS, type, { ...registeredBlock, dataProvider });
};

export const setChaiBlockComponent = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
) => {
  const registeredBlock = getRegisteredChaiBlock(type);
  set(REGISTERED_CHAI_BLOCKS, type, { ...registeredBlock, component });
};

export const closestBlockProp = (
  blockType: keyof typeof REGISTERED_CHAI_BLOCKS,
  prop: string,
): ChaiBlockPropsSchema => {
  return {
    type: "null",
    block: blockType,
    prop,
    default: null,
    runtime: true,
    ui: { "ui:widget": "hidden" },
  };
};
