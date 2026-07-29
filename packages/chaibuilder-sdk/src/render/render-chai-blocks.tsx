import { cloneDeep, find, forEach, get, isEmpty, isObject, isString, keys } from "lodash-es";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import { RenderBlocks } from "./blocks-renderer";

const applyBinding = (block: ChaiBlock | Record<string, any>, pageExternalData: Record<string, any>) => {
  const clonedBlock = cloneDeep(block);
  forEach(keys(clonedBlock), (key: string) => {
    if (isString(clonedBlock[key])) {
      let value = clonedBlock[key];
      // check for {{string.key}} and replace with pageExternalData
      const bindingRegex = /\{\{(.*?)\}\}/g;
      const matches = value.match(bindingRegex);
      if (matches) {
        matches.forEach((match: string) => {
          const binding = match.slice(2, -2);
          const bindingValue = get(pageExternalData, binding, match);
          value = value.replace(match, bindingValue);
        });
      }
      clonedBlock[key] = value;
    }
    if (isObject(clonedBlock[key])) {
      clonedBlock[key] = applyBinding(clonedBlock[key], pageExternalData);
    }
  });
  return clonedBlock;
};

export const getRuntimePropValues = (allBlocks: ChaiBlock[], blockId: string, runtimeProps: Record<string, any>) => {
  if (isEmpty(runtimeProps)) return {};
  return Object.entries(runtimeProps).reduce(
    (acc: Record<string, any>, [key, schema]) => {
      const hierarchy: ChaiBlock[] = [];
      let block: ChaiBlock | undefined = find(allBlocks, { _id: blockId }) as ChaiBlock | undefined;
      while (block) {
        hierarchy.push(block);
        block = find(allBlocks, { _id: block._parent }) as ChaiBlock | undefined;
      }
      const matchingBlock = find(hierarchy, { _type: schema.block }) as ChaiBlock | undefined;
      if (matchingBlock) {
        acc[key] = get(matchingBlock, get(schema, "prop"), null);
      }
      return acc;
    },
    {} as Record<string, any>,
  );
};

export type RenderChaiBlocksProps = {
  blocks: ChaiBlock[];
  parent?: string;
  externalData?: Record<string, unknown>;
  lang?: string;
  fallbackLang?: string;
  pageProps?: ChaiPageProps;
  draft?: boolean;
  dataProviderMetadataCallback?: (block: ChaiBlock, meta: Record<string, any>) => void;
};

export function RenderChaiBlocks(props: RenderChaiBlocksProps) {
  if (isEmpty(props.lang) && !isEmpty(props.fallbackLang)) {
    throw new Error("lang prop is required when fallbackLang is provided");
  }
  if (isEmpty(props.blocks)) {
    return null;
  }

  const lang = props.lang ?? "en";
  const fallbackLang = props.fallbackLang ?? lang;
  return <RenderBlocks {...props} lang={lang} fallbackLang={fallbackLang} />;
}
