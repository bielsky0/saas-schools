import { has, isFunction, omit } from "lodash-es";
import React from "react";
import { ChaiBlock, ChaiPageProps } from "~/types/common";

export default async function AsyncDataProviderPropsBlock(props: {
  lang: string;
  pageProps: ChaiPageProps;
  block: ChaiBlock;
  dataProvider: Promise<Record<string, any>>;
  dataProviderMetadataCallback?: (block: ChaiBlock, meta: Record<string, any>) => void;
  draft: boolean;
  children: (dataProviderProps: Record<string, any>) => React.ReactNode;
}) {
  const dataProps = await props.dataProvider;
  if (has(dataProps, "$metadata") && isFunction(props.dataProviderMetadataCallback)) {
    props.dataProviderMetadataCallback(props.block, dataProps.$metadata);
  }
  return props.children({
    ...omit(dataProps, "$metadata"),
  });
}
