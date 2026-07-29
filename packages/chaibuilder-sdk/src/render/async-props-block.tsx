import { has, isFunction, omit } from "lodash-es";
import React from "react";
import { ChaiPageProps } from "~/types";
import { ChaiBlock } from "~/types/common";

type DataProvider = (props: {
  draft: boolean;
  inBuilder: boolean;
  lang: string;
  block: ChaiBlock;
  pageProps: ChaiPageProps;
}) => Record<string, any> | Promise<Record<string, any>>;

export default async function DataProviderPropsBlock(props: {
  lang: string;
  pageProps: ChaiPageProps;
  block: ChaiBlock;
  dataProvider: DataProvider;
  dataProviderMetadataCallback?: (block: ChaiBlock, meta: Record<string, any>) => void;
  draft: boolean;
  children: (dataProviderProps: Record<string, any>) => React.ReactNode;
}) {
  const dataProviderArgs = {
    pageProps: props.pageProps,
    block: props.block,
    lang: props.lang,
    draft: props.draft,
    inBuilder: false,
  };

  const dataProps = await props.dataProvider(dataProviderArgs);

  if (has(dataProps, "$metadata") && isFunction(props.dataProviderMetadataCallback)) {
    props.dataProviderMetadataCallback(props.block, dataProps.$metadata);
  }

  return props.children({
    ...omit(dataProps, "$metadata"),
  });
}
