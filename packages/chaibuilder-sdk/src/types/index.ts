import type { ChaiBuilderEditorProps } from "~/types/chaibuilder-editor-props";

export type { ChaiBuilderEditorProps };

export type ChaiAsset = {
  url: string;
  id?: string;
  thumbnailUrl?: string;
  description?: string;
  width?: number;
  height?: number;
};

export * from "~/types/actions";
export * from "~/types/blocks";
export * from "~/types/chaibuilder-editor-props";
export * from "~/types/collections";
export * from "~/types/common";
export * from "~/types/section-catalog";
export * from "~/types/types";
