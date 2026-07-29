import { cloneDeep, forEach, get, includes, isArray, isEmpty, isString, keys, memoize, startsWith } from "lodash-es";
import { twMerge } from "tailwind-merge";
import { DESIGN_TOKEN_PREFIX, STYLES_KEY } from "~/core/constants/STRINGS";
import { getSplitChaiClasses } from "~/hooks/get-split-classes";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlock } from "~/types/common";
import { ChaiDesignTokens } from "~/types/types";

export function applyLanguage(_block: ChaiBlock, selectedLang: string, chaiBlock: ChaiBlockConfig) {
  const i18nProps = get(chaiBlock, "i18nProps", []);
  if (isEmpty(selectedLang) || isEmpty(i18nProps)) return _block;

  const block = cloneDeep(_block);
  forEach(keys(block), (key) => {
    if (includes(i18nProps, key) && !isEmpty(selectedLang)) {
      const fallbackValue = get(block, key);
      const value = get(block, `${key}-${selectedLang}`, "");
      if (isString(fallbackValue)) {
        block[key] = isString(value) && !isEmpty(value.trim()) ? value.trimStart() || fallbackValue : fallbackValue;
      } else {
        block[key] = isEmpty(value) ? fallbackValue : value;
      }
    }
  });
  return block;
}

export const applyBinding = (
  block: ChaiBlock,
  pageExternalData: Record<string, any>,
  { index, key: repeaterKey }: { index: number; key: string },
) => {
  const clonedBlock = cloneDeep(block);
  forEach(keys(clonedBlock), (key) => {
    if (isString(clonedBlock[key]) && !startsWith(key, "_")) {
      let value: any = clonedBlock[key];
      if (key === "repeaterItems") {
        clonedBlock["repeaterItemsBinding"] = value;
      }
      // check for {{string.key}} and replace with pageExternalData
      const bindingRegex = /\{\{(.*?)\}\}/g;
      const matches = value.match(bindingRegex);
      if (matches) {
        matches.forEach((match: string) => {
          let binding = match.slice(2, -2);
          if (index !== -1 && repeaterKey !== "" && startsWith(binding, "$index.")) {
            binding = `${repeaterKey.replace(/\{\{(.*)\}\}/g, "$1")}.${binding.replace("$index", `${index}`)}`;
          }
          const bindingValue = get(pageExternalData, binding, match);
          value = isArray(bindingValue) ? bindingValue : value.replace(match, bindingValue);
        });
      }
      clonedBlock[key] = value;
    }
  });
  return clonedBlock;
};

export const generateClassNames = (styles: string, designTokens: ChaiDesignTokens) => {
  const { baseClasses, classes } = getSplitChaiClasses(styles);
  const tokens = classes.split(" ").filter((token) => token.startsWith(DESIGN_TOKEN_PREFIX));
  const tokenValues = tokens.map((token) => designTokens[token]?.value);
  const nonTokenClasses = classes
    .split(" ")
    .filter((token) => !token.startsWith(DESIGN_TOKEN_PREFIX))
    .join(" ");
  return twMerge.apply(null, [baseClasses, ...tokenValues, nonTokenClasses]);
};

function getElementAttrs(block: ChaiBlock, key: string) {
  return get(block, `${key}_attrs`, {}) as Record<string, string>;
}

export function getBlockTagAttributes(
  block: ChaiBlock,
  isInBuilder: boolean = true,
  designTokens: ChaiDesignTokens = {},
) {
  const styles: Record<string, any> = {};
  Object.keys(block).forEach((key) => {
    if (isString(block[key]) && block[key].startsWith(STYLES_KEY)) {
      const className = generateClassNames(block[key], designTokens);
      const attrs = getElementAttrs(block, key);
      styles[key] = {
        ...(!isEmpty(className) && { className }),
        ...attrs,
        ...(isInBuilder
          ? {
              "data-style-prop": key,
              "data-block-parent": block._id,
              "data-style-id": `${key}-${block._id}`,
            }
          : {}),
      };
    }
  });
  return styles;
}

export const getBlockRuntimeProps = memoize((blockType: string) => {
  const chaiBlock = getRegisteredChaiBlock(blockType) as any;
  const schema = chaiBlock?.props?.schema || (chaiBlock?.schema ?? {});
  const props = get(schema, "properties", {});
  // return key value with value has runtime: true
  return Object.fromEntries(Object.entries(props).filter(([, value]) => get(value, "runtime", false)));
});

export const applyLimit = (data: unknown, block: ChaiBlock): typeof data => {
  // Only operate on arrays
  if (!isArray(data)) return data;
  let result = data as any[];

  // Only apply limit
  let limit = undefined;
  if (typeof block.limit === "number" && block.limit > 0) {
    limit = block.limit;
  }
  if (limit !== undefined) {
    result = result.slice(0, limit);
  }

  return result as typeof data;
};

export const applyChaiDataBinding = (block: Record<string, string>, pageExternalData: Record<string, any>) => {
  const clonedBlock = cloneDeep(block);
  forEach(keys(clonedBlock), (key: string) => {
    if (isString(clonedBlock[key]) && !startsWith(key, "_")) {
      let value: any = clonedBlock[key];
      if (key === "repeaterItems") {
        clonedBlock["repeaterItemsBinding"] = value;
      }
      // check for {{string.key}} and replace with pageExternalData
      const bindingRegex = /\{\{(.*?)\}\}/g;
      const matches = value.match(bindingRegex);
      if (matches) {
        matches.forEach((match: string) => {
          let binding = match.slice(2, -2);
          const bindingValue = get(pageExternalData, binding, match);
          value = isArray(bindingValue) ? bindingValue : value.replace(match, bindingValue);
        });
      }
      clonedBlock[key] = value;
    }
  });
  return clonedBlock;
};
