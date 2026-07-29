import React from "react";
import { ChaiBlock, ChaiBlockSchema, ChaiBlockUiSchema, ChaiPageProps } from "./common";

export type ChaiBlockComponentProps<
  BlockProps = unknown,
  PageData = Record<string, unknown>,
> = ChaiBlock<BlockProps> & {
  // Chai Block Props
  $loading?: boolean;
  blockProps: Record<string, string>;
  inBuilder: boolean;
  lang: string;
  draft: boolean;
  pageProps?: ChaiPageProps;
  pageData?: PageData;
  //React Node
  children?: React.ReactNode;
};

export type ChaiStyles = {
  [key: string]: string;
};

export type ChaiAsyncProp<T> = T | undefined;
export type ChaiClosestBlockProp<T> = T | undefined;
export type ChaiDataProviderArgs<T = Record<string, any>, K = Record<string, any>> = {
  block: ChaiBlock<T>;
} & K;

export interface ChaiBlockConfig {
  // required
  type: string;
  label: string;
  group: string;

  // optional
  description?: string;
  wrapper?: boolean;
  blocks?: ChaiBlock[] | (() => ChaiBlock[]);
  category?: string;
  hidden?: boolean | ((parentType?: string) => boolean);
  icon?: React.ReactNode | React.ComponentType;

  dataProviderMode?: "live" | "mock";
  dataProviderDependencies?: string[];
  dataProvider?: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    block: ChaiBlock;
    pageProps: ChaiPageProps;
  }) => Record<string, unknown>;

  //props
  props?: {
    schema: ChaiBlockSchema;
    uiSchema: ChaiBlockUiSchema;
  };
  /**
   * @deprecated Use props.schema instead
   */
  schema?: ChaiBlockSchema;
  /**
   * @deprecated Use props.uiSchema instead
   */
  uiSchema?: ChaiBlockUiSchema;

  i18nProps?: string[];
  aiProps?: string[];
  inlineEditProps?: string[];

  // callbacks
  canAcceptBlock?: (type: string) => boolean;
  canDelete?: () => boolean;
  canMove?: () => boolean;
  canDuplicate?: () => boolean;
  canBeNested?: (type: string) => boolean;
}

export interface ChaiServerBlockConfig {
  component: React.ComponentType<ChaiBlockComponentProps>;
  type: string;
  dataProvider?: (args: {
    draft: boolean;
    inBuilder: boolean;
    lang: string;
    block: ChaiBlock;
    pageProps: ChaiPageProps;
  }) => Promise<Record<string, unknown>>;
  suspenseFallback?: React.ComponentType<any>;
}
