import * as React from "react";

export type ChaiRenderBlockProps<T> = {
  blockProps: Record<string, string>;
  children?: React.ReactNode;
  inBuilder: boolean;
} & T;

export type ChaiBlockStyles = Record<string, string>;

export type {
  ChaiTheme as ChaiBuilderThemeValues,
  ChaiSavePageData as SavePageData,
} from "~/types/chaibuilder-editor-props";

export interface ChaiDesignTokens {
  [uniqueId: string]: {
    name: string;
    value: string;
    archived?: boolean;
  };
}

/**
 * Component theme tokens (`--cmp-*` CSS variables) — map of CSS var name to
 * its raw value, e.g. `{ "--cmp-btn-radius": "8px" }`. Kept OUT of `ChaiTheme`
 * on purpose (Phase 3 §4.2): separate persistence + injection, no ChaiTheme
 * regressions.
 */
export type ComponentTokens = Record<string, string>;

type ChaiBlocksWithDesignTokens = Record<string, string>;
export interface ChaiSiteWideUsageData {
  [pageId: string]: {
    name: string;
    isPartial: boolean;
    partialBlocks: string[];
    links: string[];
    designTokens: ChaiBlocksWithDesignTokens; // { blockId: Name, blockId: name 2}
  };
}
