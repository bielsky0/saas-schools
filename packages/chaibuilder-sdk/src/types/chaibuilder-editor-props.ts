import React from "react";
import { StructureRule } from "~/hooks/structure-rules";
import { ChaiPage } from "~/pages/utils/page-organization";
import { ChaiBlock } from "~/types/common";
import { ChaiLoggedInUser, ChaiPageType } from "./actions";
import { ChaiCollectoin } from "./collections";
import { ChaiDesignTokens, ChaiSiteWideUsageData } from "./types";

export type ChaiLibraryBlock<T = Record<string, any>> = {
  id: string;
  group: string;
  name: string;
  preview?: string;
  tags?: string[];
  description?: string;
} & T;

export type ChaiLibrary<T = Record<string, any>> = {
  id: string;
  name: string;
  blocks?: ChaiLibraryBlock[];
  description?: string;
} & T;

type ReactComponentType = React.ComponentType<any>;

type CSSVariableName = string;
type HSLColor = string;
type HexColor = string;
export type ChaiCssVariableNameWithDefault = Record<CSSVariableName, any>;
type VariableKey = string;
export type ChaiBorderRadiusValue = false | string;

export type ChaiThemeOptions = {
  fontFamily: false | Record<VariableKey, string>;
  borderRadius: ChaiBorderRadiusValue;
  colors: {
    group: string;
    items: Record<VariableKey, [HSLColor, HSLColor]>;
  }[];
};

export type ChaiBreakpoint = {
  title: string;
  content: string;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  icon: React.ReactNode | Element;
  width: number;
};

export type ChaiSavePageData = {
  autoSave: boolean;
  blocks: ChaiBlock[];
  needTranslations?: boolean;
  designTokens: ChaiDesignTokens;
  partialIds?: string[];
  linkPageIds?: string[];
};

export type ChaiSaveWebsiteData =
  | { type: "THEME"; data: ChaiTheme }
  | { type: "DESIGN_TOKENS"; data: ChaiDesignTokens };

export type ChaiAskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<any, number>;
  error?: any;
};

export type ChaiTheme = {
  fontFamily: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  colors: {
    background: [HexColor, HexColor];
    foreground: [HexColor, HexColor];
    primary: [HexColor, HexColor];
    "primary-foreground": [HexColor, HexColor];
    secondary: [HexColor, HexColor];
    "secondary-foreground": [HexColor, HexColor];
    muted: [HexColor, HexColor];
    "muted-foreground": [HSLColor, HSLColor];
    accent: [HSLColor, HSLColor];
    "accent-foreground": [HSLColor, HSLColor];
    destructive: [HSLColor, HSLColor];
    "destructive-foreground": [HSLColor, HSLColor];
    border: [HSLColor, HSLColor];
    input: [HSLColor, HSLColor];
    ring: [HexColor, HexColor];
    card: [HexColor, HexColor];
    "card-foreground": [HexColor, HexColor];
    popover: [HexColor, HexColor];
    "popover-foreground": [HexColor, HexColor];
  };
};

export interface ChaiBuilderEditorProps {
  children?: React.ReactNode;
  /**
   * Goto page callback
   */
  gotoPage?: ({ pageId, lang }: { pageId: string; lang: string }) => void;

  /**
   * User
   */
  user?: ChaiLoggedInUser;

  /**
   * Permissions
   */
  permissions?: string[] | null;

  /**
   * Optional pageId. If not provided, a random pageId will be generated
   */
  pageId?: string;

  /**
   * Page external data
   */
  pageExternalData?: Record<string, any>;

  /**
   * Theme presets
   */
  themePresets?: Record<string, Partial<ChaiTheme>>[];

  /**
   * Theme
   */
  theme?: ChaiTheme;

  /**
   * Builder theme
   */
  builderTheme?: ChaiTheme;

  /**
   * Theme panel component
   * TODO: Move to registerChaiThemePanelComponent()
   */
  themePanelComponent?: ReactComponentType;
  /**
   * onError callback function
   * @param error
   */
  onError?: (error: Error) => void;
  /**
   * Translations object
   */
  translations?: Record<string, Record<string, any>>;

  /**
   * Custom layout component
   * TODO: Move to registerChaiLayoutComponent()
   */
  layout?: React.ComponentType;

  /**
   * HTML direction.
   */
  htmlDir?: "ltr" | "rtl";

  /**
   * Show debug logs
   */
  debugLogs?: boolean;

  /**
   * Auto save support
   */
  autoSave?: boolean;

  /**
   * Auto save interval in seconds
   */
  autoSaveActionsCount?: number;

  /**
   * Breakpoints
   */
  breakpoints?: ChaiBreakpoint[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Locale
   */
  locale?: string;

  /**
   * Ask AI callback
   */
  askAiCallBack?: (
    type: "styles" | "content",
    prompt: string,
    blocks: ChaiBlock[],
    lang: string,
  ) => Promise<ChaiAskAiResponse>;

  /**
   * Get partial blocks
   * @returns {Record<string, { type: string; name: string; description?: string }>}
   */
  getPartialBlocks?: () => Promise<Record<string, { type: string; name: string; description?: string }>>;

  /**
   * Get all blocks of a partial block
   */
  getPartialBlockBlocks?: (partialBlockKey: string) => Promise<ChaiBlock[]>;

  /**
   * Blocks for the page
   */
  blocks?: ChaiBlock[];

  /**
   * onSave callback function
   * @param saveData
   */
  onSave?: ({ blocks, autoSave }: ChaiSavePageData) => Promise<boolean | Error>;

  /**
   * onSaveWebsiteData callback function for theme and design tokens
   * @param saveData
   */
  onSaveWebsiteData?: (data: ChaiSaveWebsiteData) => Promise<boolean | Error>;

  /**
   * onSaveStateChange callback function
   * @param syncStatus
   */
  onSaveStateChange?: (syncStatus: "SAVED" | "SAVING" | "UNSAVED") => void;

  /**
   * Preview component
   * TODO: Move to registerChaiPreviewComponent()
   */
  previewComponent?: ReactComponentType;

  /**
   * Content locale
   */
  fallbackLang?: string;

  /**
   * Languages
   */
  languages?: string[];

  /**
   * Page Types props
   */
  pageTypes?: ChaiPageType[];

  /**
   * Search page type items
   */
  searchPageTypeItems?: (
    pageTypeKey: string,
    query: string,
  ) => Promise<Pick<ChaiPage, "id" | "slug" | "name">[] | Error>;

  /**
   * Collections
   */
  collections?: ChaiCollectoin[];

  /**
   * Get Block Async Props
   */
  getBlockAsyncProps?: (args: { block: ChaiBlock }) => Promise<{ [key: string]: any }>;

  /**
   * temporary props. Not to be used in production
   */
  flags?: {
    copyPaste?: boolean;
    exportCode?: boolean;
    darkMode?: boolean;
    dataBinding?: boolean;
    importHtml?: boolean;
    importTheme?: boolean;
    gotoSettings?: boolean;
    dragAndDrop?: boolean;
    validateStructure?: boolean;
    ai?: boolean;
  };

  //TODO: Move to registerChaiStructureRules()
  structureRules?: StructureRule[];

  designTokens?: ChaiDesignTokens;

  siteWideUsage?: ChaiSiteWideUsageData;

  /**
   * Screen to small message component
   */
  smallScreenComponent?: ReactComponentType;
}
