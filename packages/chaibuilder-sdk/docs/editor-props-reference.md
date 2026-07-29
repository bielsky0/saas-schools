# Editor Props Reference

Complete reference for all `ChaiBuilderEditor` component props.

## Core Props

| Prop      | Type          | Default        | Description              |
| --------- | ------------- | -------------- | ------------------------ |
| `blocks`  | `ChaiBlock[]` | `[]`           | Initial blocks to render |
| `pageId`  | `string`      | auto-generated | Unique page identifier   |
| `loading` | `boolean`     | `false`        | Show loading state       |

## Save & Callbacks

| Prop                   | Type                                                 | Description                                   |
| ---------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `onSave`               | `(data: SavePageData) => Promise<boolean \| Error>`  | Called when saving. Return `true` on success. |
| `onSaveStateChange`    | `(status: "SAVED" \| "SAVING" \| "UNSAVED") => void` | Called when save state changes                |
| `onError`              | `(error: Error) => void`                             | Error handler callback                        |
| `autoSave`             | `boolean`                                            | Enable auto-save                              |
| `autoSaveActionsCount` | `number`                                             | Number of actions before auto-save triggers   |

### SavePageData Type

```typescript
type SavePageData = {
  autoSave: boolean;
  blocks: ChaiBlock[];
  theme?: ChaiThemeValues;
  needTranslations?: boolean;
  designTokens: DesignTokens;
};
```

## User & Permissions

| Prop          | Type       | Description                 |
| ------------- | ---------- | --------------------------- |
| `user`        | `object`   | Current user information    |
| `permissions` | `string[]` | List of granted permissions |

### User Object

```typescript
user?: {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}
```

See [Permissions](./Permissions.md) for available permission values.

## Theme Configuration

| Prop                  | Type                                    | Description                  |
| --------------------- | --------------------------------------- | ---------------------------- |
| `theme`               | `Partial<ChaiThemeValues>`              | Current theme values         |
| `themePresets`        | `Record<string, ChaiThemeValues>[]`     | Available theme presets      |
| `themeOptions`        | `(defaults) => ChaiBuilderThemeOptions` | Customize theme options      |
| `themePanelComponent` | `React.ComponentType`                   | Custom theme panel component |

See [Theme Presets](./Theme-Presets.md) for detailed theme configuration.

## Internationalization

| Prop           | Type                                  | Description                   |
| -------------- | ------------------------------------- | ----------------------------- |
| `locale`       | `string`                              | UI locale                     |
| `fallbackLang` | `string`                              | Fallback language for content |
| `languages`    | `string[]`                            | Available content languages   |
| `translations` | `Record<string, Record<string, any>>` | Translation strings           |
| `htmlDir`      | `"ltr" \| "rtl"`                      | HTML direction                |

## AI Integration

| Prop            | Type                                                     | Description           |
| --------------- | -------------------------------------------------------- | --------------------- |
| `askAiCallBack` | `(type, prompt, blocks, lang) => Promise<AskAiResponse>` | AI assistant callback |

```typescript
askAiCallBack?: (
  type: "styles" | "content",
  prompt: string,
  blocks: ChaiBlock[],
  lang: string,
) => Promise<AskAiResponse>;

type AskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<any, number>;
  error?: any;
};
```

## Partial Blocks (Reusable Components)

| Prop                    | Type                                    | Description                    |
| ----------------------- | --------------------------------------- | ------------------------------ |
| `getPartialBlocks`      | `() => Promise<Record<string, {...}>>`  | Fetch available partial blocks |
| `getPartialBlockBlocks` | `(key: string) => Promise<ChaiBlock[]>` | Fetch blocks for a partial     |

## Collections & Data

| Prop                 | Type                        | Description                  |
| -------------------- | --------------------------- | ---------------------------- |
| `collections`        | `ChaiCollection[]`          | Available data collections   |
| `pageExternalData`   | `Record<string, any>`       | External data for the page   |
| `getBlockAsyncProps` | `(args) => Promise<object>` | Fetch async props for blocks |

## Page Types

| Prop                  | Type                                          | Description              |
| --------------------- | --------------------------------------------- | ------------------------ |
| `pageTypes`           | `PageType[]`                                  | Available page types     |
| `searchPageTypeItems` | `(typeKey, query) => Promise<PageTypeItem[]>` | Search page type items   |
| `gotoPage`            | `({ pageId, lang }) => void`                  | Navigate to another page |

## Layout & UI

| Prop               | Type                  | Description              |
| ------------------ | --------------------- | ------------------------ |
| `layout`           | `React.ComponentType` | Custom layout component  |
| `previewComponent` | `React.ComponentType` | Custom preview component |
| `breakpoints`      | `Breakpoint[]`        | Custom breakpoints       |
| `children`         | `React.ReactNode`     | Children elements        |

### Breakpoint Type

```typescript
type Breakpoint = {
  title: string;
  content: string;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  icon: React.ReactNode;
  width: number;
};
```

## Feature Flags

| Prop    | Type     | Description     |
| ------- | -------- | --------------- |
| `flags` | `object` | Feature toggles |

See [Feature Flags](./Feature-Flags.md) for all available flags.

## Advanced

| Prop             | Type              | Description                     |
| ---------------- | ----------------- | ------------------------------- |
| `structureRules` | `StructureRule[]` | HTML structure validation rules |
| `designTokens`   | `DesignTokens`    | Design token definitions        |
| `siteWideUsage`  | `SiteWideUsage`   | Site-wide usage tracking        |
| `debugLogs`      | `boolean`         | Enable debug logging            |
