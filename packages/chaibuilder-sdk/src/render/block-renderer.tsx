import { get, has, isArray, isFunction, isNull, isString } from "lodash-es";
import { createElement, Suspense } from "react";
import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "~/core/components/canvas/static/new-blocks-render-helpers";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import { applyBindingToBlockProps } from "./apply-binding";
import DataProviderPropsBlock from "./async-props-block";
import { resolveBinding } from "./binding-engine";
import { getRuntimePropValues, RenderChaiBlocksProps } from "./render-chai-blocks";

const SuspenseFallback = () => <div></div>;

export const RenderBlock = (
  props: RenderChaiBlocksProps & {
    repeaterData?: { index: number; dataKey: string };
    block: ChaiBlock;
    children: ({
      _id,
      _type,
      repeaterItems,
      $repeaterItemsKey,
    }: {
      _id: string;
      _type: string;
      repeaterItems?: any;
      $repeaterItemsKey?: string;
      partialBlockId?: string;
    }) => React.ReactNode;
  },
) => {
  const { block, lang, fallbackLang, children, externalData, blocks, draft, pageProps, dataProviderMetadataCallback } =
    props;
  const registeredChaiBlock = getRegisteredChaiBlock(block._type) as ChaiBlockConfig;
  const Component = get(registeredChaiBlock, "component", null);
  const index = get(props.repeaterData, "index", -1);
  const dataKey = get(props.repeaterData, "dataKey", "");

  const bindingLangSuffix = lang === fallbackLang ? "" : (lang ?? "");
  const blockWithBinding: ChaiBlock = applyBindingToBlockProps(
    applyLanguage(block, bindingLangSuffix, registeredChaiBlock),
    externalData ?? {},
    { index, key: dataKey },
  );
  const blockAttributesProps = getBlockTagAttributes(block, false);
  const runtimeProps = getRuntimePropValues(blocks, block._id, getBlockRuntimeProps(block._type));
  const hasDataProvider = has(registeredChaiBlock, "dataProvider") && isFunction(registeredChaiBlock.dataProvider);

  const newBlock: ChaiBlock = {
    ...blockWithBinding,
    ...blockAttributesProps,
    ...runtimeProps,
    inBuilder: false,
  };

  const blockProps = {
    blockProps: {},
    lang: lang || fallbackLang || "en",
    draft: draft ?? false,
    pageData: externalData ?? {},
    ...newBlock,
  };
  let isShown = get(newBlock, "_show", true);
  if (isString(isShown) && isShown.startsWith("{{")) {
    const resolved = resolveBinding(isShown, externalData as Record<string, any>);
    isShown = resolved !== "false";
  }
  if (isNull(Component) || !isShown) return null;

  if (hasDataProvider) {
    const suspenseFallback = get(registeredChaiBlock, "suspenseFallback", SuspenseFallback) as React.ComponentType<any>;
    return (
      <Suspense fallback={createElement(suspenseFallback)}>
        <DataProviderPropsBlock
          lang={lang ?? ""}
          pageProps={pageProps as ChaiPageProps}
          block={newBlock}
          dataProvider={registeredChaiBlock.dataProvider!}
          {...(dataProviderMetadataCallback ? { dataProviderMetadataCallback } : {})}
          draft={draft ?? false}>
          {(dataProviderProps) => {
            return createElement(Component, {
              ...blockProps,
              ...dataProviderProps,
              children: children({
                _id: block._id,
                _type: block._type,
                ...(isArray(blockWithBinding.repeaterItems)
                  ? {
                      repeaterItems: applyLimit(blockWithBinding.repeaterItems, block),
                      $repeaterItemsKey: blockWithBinding.$repeaterItemsKey,
                      repeaterTotalItems: blockWithBinding.repeaterTotalItems ?? -1,
                    }
                  : {}),
              }),
            });
          }}
        </DataProviderPropsBlock>
      </Suspense>
    );
  }

  return (
    <Suspense>
      {createElement(Component, {
        ...blockProps,
        children: children({
          _id: block._id,
          _type: block._type,
          ...(isArray(blockWithBinding.repeaterItems)
            ? {
                repeaterItems: applyLimit(blockWithBinding.repeaterItems, block),
                $repeaterItemsKey: blockWithBinding.$repeaterItemsKey,
                repeaterTotalItems: blockWithBinding.repeaterTotalItems ?? -1,
              }
            : {}),
        }),
      })}
    </Suspense>
  );
};
