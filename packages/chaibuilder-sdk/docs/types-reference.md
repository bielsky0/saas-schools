# Types Reference

Complete type definitions for ChaiBuilder SDK.

---

## ChaiBlock

The core block type representing a single element in the builder.

```typescript
type ChaiBlock<T = Record<string, any>> = {
  _id: string; // Unique identifier
  _type: string; // Block type (e.g., "Box", "Text", "Image")
  _name?: string; // Optional display name
  _parent?: string | null | undefined; // Parent block ID
  _libBlock?: string; // Library block reference
  partialBlockId?: string; // Partial block reference
} & T; // Additional block-specific properties
```

### Example

```typescript
const block: ChaiBlock = {
  _id: "block-123",
  _type: "Box",
  _parent: "parent-456",
  styles: "p-4 bg-white rounded-lg",
  tag: "section",
};
```

---

## ChaiBlockComponentProps

Props passed to block components during rendering.

```typescript
type ChaiBlockComponentProps<BlockProps = unknown, PageData = Record<string, unknown>> = ChaiBlock<BlockProps> & {
  $loading?: boolean;
  blockProps: Record<string, string>;
  inBuilder: boolean;
  lang: string;
  draft: boolean;
  pageProps?: ChaiPageProps;
  pageData?: PageData;
  children?: React.ReactNode;
};
```

---

## ChaiBlockConfig

Configuration for registering a custom block.

```typescript
interface ChaiBlockConfig {
  // Required
  type: string;
  label: string;
  group: string;

  // Optional
  description?: string;
  wrapper?: boolean;
  blocks?: ChaiBlock[] | (() => ChaiBlock[]);
  category?: string;
  hidden?: boolean | ((parentType?: string) => boolean);
  icon?: React.ReactNode | React.ComponentType;

  // Data Provider
  dataProviderMode?: "live" | "mock";
  dataProviderDependencies?: string[];
  dataProvider?: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    block: ChaiBlock;
    pageProps: ChaiPageProps;
  }) => Record<string, unknown>;

  // Props Schema
  props?: {
    schema: ChaiBlockSchema;
    uiSchema: ChaiBlockUiSchema;
  };
  /** @deprecated Use props.schema instead */
  schema?: ChaiBlockSchema;
  /** @deprecated Use props.uiSchema instead */
  uiSchema?: ChaiBlockUiSchema;

  // Property Configuration
  i18nProps?: string[];
  aiProps?: string[];
  inlineEditProps?: string[];

  // Callbacks
  canAcceptBlock?: (type: string) => boolean;
  canDelete?: () => boolean;
  canMove?: () => boolean;
  canDuplicate?: () => boolean;
  canBeNested?: (type: string) => boolean;
}
```

---

## ChaiServerBlockConfig

Configuration for server-side block rendering.

```typescript
interface ChaiServerBlockConfig {
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
```

---

## ChaiBuilderEditorProps

Props for the main `ChaiBuilderEditor` component.

```typescript
interface ChaiBuilderEditorProps {
  children?: React.ReactNode;

  // Navigation
  gotoPage?: ({ pageId, lang }: { pageId: string; lang: string }) => void;

  // User & Permissions
  user?: ChaiLoggedInUser;
  permissions?: string[] | null;

  // Page
  pageId?: string;
  pageExternalData?: Record<string, any>;
  blocks?: ChaiBlock[];

  // Theme
  themePresets?: Record<string, Partial<ChaiTheme>>[];
  theme?: ChaiTheme;
  builderTheme?: ChaiTheme;
  themePanelComponent?: React.ComponentType<any>;

  // Callbacks
  onError?: (error: Error) => void;
  onSave?: ({ blocks, theme, autoSave }: ChaiSavePageData) => Promise<boolean | Error>;
  onSaveStateChange?: (syncStatus: "SAVED" | "SAVING" | "UNSAVED") => void;

  // i18n
  translations?: Record<string, Record<string, any>>;
  htmlDir?: "ltr" | "rtl";
  locale?: string;
  fallbackLang?: string;
  languages?: string[];

  // Layout & UI
  layout?: React.ComponentType;
  previewComponent?: React.ComponentType<any>;
  breakpoints?: ChaiBreakpoint[];
  smallScreenComponent?: React.ComponentType<any>;

  // Auto-save
  autoSave?: boolean;
  autoSaveActionsCount?: number;

  // Loading
  loading?: boolean;

  // AI
  askAiCallBack?: (
    type: "styles" | "content",
    prompt: string,
    blocks: ChaiBlock[],
    lang: string,
  ) => Promise<ChaiAskAiResponse>;

  // Partial Blocks
  getPartialBlocks?: () => Promise<Record<string, { type: string; name: string; description?: string }>>;
  getPartialBlockBlocks?: (partialBlockKey: string) => Promise<ChaiBlock[]>;

  // Page Types
  pageTypes?: ChaiPageType[];
  searchPageTypeItems?: (
    pageTypeKey: string,
    query: string,
  ) => Promise<Pick<ChaiPage, "id" | "slug" | "name">[] | Error>;

  // Collections
  collections?: ChaiCollectoin[];

  // Async Props
  getBlockAsyncProps?: (args: { block: ChaiBlock }) => Promise<{ [key: string]: any }>;

  // Feature Flags
  flags?: {
    librarySite?: boolean;
    copyPaste?: boolean;
    exportCode?: boolean;
    darkMode?: boolean;
    dataBinding?: boolean;
    importHtml?: boolean;
    importTheme?: boolean;
    gotoSettings?: boolean;
    dragAndDrop?: boolean;
    validateStructure?: boolean;
    designTokens?: boolean;
    ai?: boolean;
  };

  // Advanced
  structureRules?: StructureRule[];
  designTokens?: ChaiDesignTokens;
  siteWideUsage?: ChaiSiteWideUsageData;
  debugLogs?: boolean;
}
```

---

## ChaiTheme

Theme configuration values.

```typescript
type HexColor = string; // e.g., "#ffffff"
type HSLColor = string; // e.g., "210 40% 98%"

type ChaiTheme = {
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
```

---

## ChaiThemeOptions

Theme options configuration for customizing available theme settings.

```typescript
type CSSVariableName = string;
type VariableKey = string;
type ChaiBorderRadiusValue = false | string;

type ChaiThemeOptions = {
  fontFamily: false | Record<VariableKey, string>;
  borderRadius: ChaiBorderRadiusValue;
  colors: {
    group: string;
    items: Record<VariableKey, [HSLColor, HSLColor]>;
  }[];
};
```

---

## ChaiSavePageData

Data passed to the `onSave` callback.

```typescript
type ChaiSavePageData = {
  autoSave: boolean;
  blocks: ChaiBlock[];
  theme?: ChaiTheme;
  needTranslations?: boolean;
  designTokens: ChaiDesignTokens;
};
```

---

## ChaiAskAiResponse

AI callback response type.

```typescript
type ChaiAskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<any, number>;
  error?: any;
};
```

---

## ChaiBreakpoint

Custom breakpoint definition.

```typescript
type ChaiBreakpoint = {
  title: string;
  content: string;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  icon: React.ReactNode | Element;
  width: number;
};
```

---

## ChaiCollectoin

Data collection definition.

```typescript
type FilterOptions = {
  id: string;
  name: string;
  description?: string;
};

type SortOptions = {
  id: string;
  name: string;
  description?: string;
};

type ChaiCollectoin = {
  id: string;
  name: string;
  description?: string;
  filters?: FilterOptions[];
  sorts?: SortOptions[];
};
```

---

## ChaiLibrary & ChaiLibraryBlock

Block library types.

```typescript
type ChaiLibraryBlock<T = Record<string, any>> = {
  id: string;
  group: string;
  name: string;
  preview?: string;
  tags?: string[];
  description?: string;
} & T;

type ChaiLibrary<T = Record<string, any>> = {
  id: string;
  name: string;
  blocks?: ChaiLibraryBlock[];
  description?: string;
} & T;
```

---

## ChaiAsset

Asset/media type.

```typescript
type ChaiAsset = {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  size?: number;
  folderId: string | null;

  // Optional
  thumbnailUrl?: string;
  description?: string;
  duration?: number;
  format?: string;
  width?: number;
  height?: number;
};
```

---

## ChaiDesignTokens

Design token definitions.

```typescript
interface ChaiDesignTokens {
  [uniqueId: string]: {
    name: string;
    value: string;
  };
}
```

---

## ChaiSiteWideUsageData

Site-wide usage data for tracking design tokens and links across pages.

```typescript
type ChaiBlocksWithDesignTokens = Record<string, string>;

interface ChaiSiteWideUsageData {
  [pageId: string]: {
    name: string;
    isPartial: boolean;
    partialBlocks: string[];
    links: string[];
    designTokens: ChaiBlocksWithDesignTokens;
  };
}
```

---

## ChaiPageType

Page type definitions for dynamic pages.

```typescript
type ChaiPageType = {
  key: string;
  helpText?: string;
  icon?: string;
  hasSlug?: boolean;
  name: string | (() => Promise<string>);
  dynamicSegments?: string;
  dynamicSlug?: string;
  getDynamicPages?: ({
    query,
    uuid,
  }: {
    query?: string;
    uuid?: string;
  }) => Promise<Pick<ChaiPage, "id" | "name" | "slug" | "primaryPage">[]>;
  search?: (query: string) => Promise<Pick<ChaiPage, "id" | "name" | "slug">[] | Error>;
  resolveLink?: (id: string, draft?: boolean, lang?: string) => Promise<string>;
  onCreate?: (data: Partial<ChaiPage> & { id: string }) => Promise<void>;
  onUpdate?: (data: Partial<ChaiPage> & { id: string }) => Promise<void>;
  onDelete?: (data: Pick<ChaiPage, "id">) => Promise<void>;

  // Page data
  dataProvider?: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    pageProps: ChaiPageProps;
  }) => Promise<Record<string, any>>;

  // Extra options
  defaultSeo?: () => Record<string, any>;
  defaultJSONLD?: () => Record<string, any>;
  defaultMetaTags?: () => Record<string, string>;
};
```

---

## ChaiPage

Full page type definition.

```typescript
type ChaiPageSeo = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  jsonLD?: string;
};

type ChaiPage = {
  id: string;
  slug: string;
  lang: string;
  name: string;
  pageType: string;
  blocks: ChaiBlock[];
  createdAt: string;
  lastSaved: string;
  dynamic: boolean;
  online: boolean;
  seo: ChaiPageSeo;
  app: string;
  primaryPage?: string | null;
  currentEditor?: string | null;
  changes: object[];
  parent?: string | null;
  libRefId?: string | null;
  dynamicSlugCustom?: string | null;
  metadata?: object;
  jsonld?: object;
  globalJsonLds?: string[];
  links?: string;
  partialBlocks?: string;
  designTokens?: ChaiDesignTokens;
};
```

---

## ChaiPageProps

Props passed to page components.

```typescript
type ChaiPageProps<T = Record<string, any>> = {
  slug: string;
  searchParams?: Record<string, string>;
} & T;
```

---

## ChaiLoggedInUser

Logged-in user type.

```typescript
interface ChaiLoggedInUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}
```

---

## ChaiRenderBlockProps

Props passed to block render components.

```typescript
type ChaiRenderBlockProps<T> = {
  blockProps: Record<string, string>;
  children?: React.ReactNode;
  inBuilder: boolean;
} & T;
```

---

## ChaiBlockSchema & ChaiBlockUiSchema

Schema types for block property definitions.

```typescript
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

type ChaiBlockUiSchema = UiSchema;

type ChaiBlockPropsSchema = RJSFSchema & {
  properties?: { [key: string]: RJSFSchema } | undefined;
  enumNames?: (string | number)[];
};

type ChaiBlockSchema = {
  properties?: Record<string, ChaiBlockPropsSchema>;
  allOf?: any[];
  oneOf?: any[];
} & Partial<Pick<ChaiBlockPropsSchema, "required" | "dependencies" | "ui" | "title" | "description" | "default">>;
```

---

## ChaiFont

Font configuration types.

```typescript
type ChaiFontViaUrl = {
  family: string;
  url: string;
  fallback: string;
};

type ChaiFontViaSrc = {
  family: string;
  src: {
    url: string;
    format: string;
    fontWeight?: string;
    fontStyle?: string;
    fontDisplay?: string;
    fontStretch?: string;
  }[];
  fallback: string;
};

type ChaiFont = ChaiFontViaUrl | ChaiFontViaSrc;
```

---

## ChaiWebsiteSetting

Website settings type.

```typescript
type ChaiWebsiteSetting = {
  appKey: string;
  fallbackLang: string;
  languages: string[];
  theme: ChaiTheme;
  settings: Record<string, any>;
  designTokens: ChaiDesignTokens;
};
```

---

## ChaiStyles & ChaiBlockStyles

Style types.

```typescript
type ChaiStyles = {
  [key: string]: string;
};

type ChaiBlockStyles = Record<string, string>;
```

---

## ChaiAsyncProp & ChaiClosestBlockProp

Utility types for async and closest block props.

```typescript
type ChaiAsyncProp<T> = T | undefined;
type ChaiClosestBlockProp<T> = T | undefined;
type ChaiDataProviderArgs<T = Record<string, any>, K = Record<string, any>> = {
  block: ChaiBlock<T>;
} & K;
```
