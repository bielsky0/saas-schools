import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { LoggedInUser } from "~/pages/types/loggedin-user";
import { ChaiBuilderEditorProps } from "./chaibuilder-editor-props";

type ChaiBlock<T = Record<string, any>> = {
  _id: string;
  _name?: string;
  _parent?: string | null | undefined;
  _libBlock?: string;
  _type: string;
  partialBlockId?: string;
} & T;

export interface ChaiCoreBlock {
  blocks?: ChaiBlock[];
  data: any;
  props: { [key: string]: any };
  type: string;
  _name?: string;
  partialBlockId?: string;
}

export type { ChaiBlock };
export type ChaiBlockUiSchema = UiSchema;
export type ChaiBlockPropsSchema = RJSFSchema & {
  properties?:
    | {
        [key: string]: RJSFSchema;
      }
    | undefined;
  enumNames?: (string | number)[];
};
export type ChaiBlockSchema = {
  properties?: Record<string, ChaiBlockPropsSchema>;
  allOf?: any[];
  oneOf?: any[];
} & Partial<Pick<ChaiBlockPropsSchema, "required" | "dependencies" | "ui" | "title" | "description" | "default">>;

export type ChaiBlockSchemas = {
  schema: object | Omit<ChaiBlockSchema, "ui">;
  uiSchema?: ChaiBlockUiSchema;
};
export type ChaiBlockRJSFSchemas = {
  schema: object | Omit<ChaiBlockSchema, "ui">;
  uiSchema: ChaiBlockUiSchema;
};
export type ChaiWebsiteBuilderProps = {
  hasReactQueryProvider?: boolean;
  topLeftCorner?: React.FC;
  apiUrl?: string;
  getPreviewUrl?: (slug: string) => string;
  getLiveUrl?: (slug: string) => string;
  onLogout?: (reason?: string) => void;
  getAccessToken?: () => Promise<string>;
  currentUser: LoggedInUser | null;
} & Pick<
  ChaiBuilderEditorProps,
  | "onError"
  | "translations"
  | "locale"
  | "htmlDir"
  | "autoSave"
  | "autoSaveActionsCount"
  | "fallbackLang"
  | "languages"
  | "themePresets"
  | "flags"
  | "structureRules"
  | "layout"
  | "smallScreenComponent"
>;

export type ChaiPageProps<T = Record<string, any>> = {
  slug: string;
  searchParams?: Record<string, string>;
} & T;

export type ChaiFontByUrl = {
  family: string;
  url: string;
  fallback: string;
};

export type ChaiFontSource = {
  url: string;
  format: string;
  fontWeight?: string;
  fontStyle?: string;
  fontDisplay?: string;
  fontStretch?: string;
};

export type ChaiFontBySrc = {
  family: string;
  src: ChaiFontSource[];
  fallback: string;
};

export type ChaiSystemFont = {
  family: string;
  fallback: string;
};

export type ChaiFont = ChaiFontByUrl | ChaiFontBySrc | ChaiSystemFont;
