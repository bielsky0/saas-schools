# Extensions API

ChaiBuilder provides several registration APIs to extend the editor functionality.

## Overview

| API                             | Purpose                   |
| ------------------------------- | ------------------------- |
| `registerChaiSidebarPanel`      | Add custom sidebar panels |
| `registerChaiMediaManager`      | Custom asset/media picker |
| `registerChaiLibrary`           | External block libraries  |
| `registerChaiTopBar`            | Custom top toolbar        |
| `registerChaiSaveToLibrary`     | Save blocks to library UI |
| `registerChaiAddBlockTab`       | Custom "Add Block" tabs   |
| `registerChaiFont`              | Register custom fonts     |
| `registerChaiPreImportHTMLHook` | Pre-process imported HTML |
| `registerBlockSettingWidget`    | Custom form widgets       |
| `registerBlockSettingField`     | Custom form fields        |
| `registerBlockSettingTemplate`  | Custom form templates     |

---

## registerChaiSidebarPanel

Add custom panels to the editor sidebar.

```typescript
import { registerChaiSidebarPanel } from "@chaibuilder/sdk";

registerChaiSidebarPanel("my-panel", {
  label: "My Panel",
  position: "top", // or "bottom"
  button: ({ isActive, show, panelId, position }) => (
    <button onClick={show} className={isActive ? "active" : ""}>
      My Panel
    </button>
  ),
  panel: () => (
    <div className="p-4">
      <h2>My Custom Panel</h2>
      {/* Panel content */}
    </div>
  ),
  width: 300, // optional
  view: "standard", // "standard" | "modal" | "overlay" | "drawer"
});
```

### ChaiSidebarPanel Type

```typescript
interface ChaiSidebarPanel {
  id: string;
  position: "top" | "bottom";
  view?: "standard" | "modal" | "overlay" | "drawer";
  button: React.ComponentType<{
    isActive: boolean;
    show: () => void;
    panelId: string;
    position: "top" | "bottom";
  }>;
  label: string;
  panel?: React.ComponentType;
  width?: number;
  icon?: React.ReactNode;
}
```

---

## registerChaiMediaManager

Replace the default media picker with a custom implementation.

```typescript
import { registerChaiMediaManager } from "@chaibuilder/sdk";

registerChaiMediaManager(({ close, onSelect, mode }) => {
  // mode: "image" | "video" | "audio"

  const handleSelect = (asset) => {
    onSelect({
      id: asset.id,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      description: asset.alt,
    });
    close();
  };

  return (
    <div className="p-4">
      <h2>Select {mode}</h2>
      {/* Your media browser UI */}
      <button onClick={() => handleSelect(selectedAsset)}>
        Insert
      </button>
      <button onClick={close}>Cancel</button>
    </div>
  );
});
```

### MediaManagerProps Type

```typescript
type MediaManagerProps = {
  assetId?: string;
  close: () => void;
  onSelect: (assets: ChaiAsset | ChaiAsset[]) => void;
  mode?: "image" | "video" | "audio";
};

type ChaiAsset = {
  url: string;
  id?: string;
  thumbnailUrl?: string;
  description?: string;
  width?: number;
  height?: number;
};
```

---

## registerChaiLibrary

Register external block libraries that users can browse and add blocks from.

```typescript
import { registerChaiLibrary } from "@chaibuilder/sdk";

registerChaiLibrary("my-library", {
  name: "My Block Library",
  description: "Custom UI components",

  getBlocksList: async (library) => {
    const response = await fetch("/api/blocks");
    const blocks = await response.json();
    return blocks.map((block) => ({
      id: block.id,
      group: block.category,
      name: block.name,
      preview: block.thumbnailUrl,
      tags: block.tags,
      description: block.description,
    }));
  },

  getBlock: async ({ library, block }) => {
    const response = await fetch(`/api/blocks/${block.id}`);
    const html = await response.text();
    return html; // Return HTML string or ChaiBlock[]
  },
});
```

### ChaiLibraryConfig Type

```typescript
type ChaiLibraryConfig<T> = {
  id: string;
  name: string;
  description: string;
  getBlocksList: (library: ChaiLibrary) => Promise<ChaiLibraryBlock<T>[]>;
  getBlock: (args: { library: ChaiLibrary; block: ChaiLibraryBlock<T> }) => Promise<string | ChaiBlock[]>; // HTML string or blocks array
};

type ChaiLibraryBlock<T> = {
  id: string;
  group: string;
  name: string;
  preview?: string;
  tags?: string[];
  description?: string;
} & T;
```

---

## registerChaiTopBar

Replace the default top toolbar with a custom component.

```typescript
import { registerChaiTopBar } from "@chaibuilder/sdk";

const CustomTopBar = () => {
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2">
        <Logo />
        <PageTitle />
      </div>
      <div className="flex items-center gap-2">
        <UndoRedoButtons />
        <PreviewButton />
        <SaveButton />
      </div>
    </div>
  );
};

registerChaiTopBar(CustomTopBar);
```

---

## registerChaiSaveToLibrary

Provide a custom UI for saving blocks to a library.

```typescript
import { registerChaiSaveToLibrary } from "@chaibuilder/sdk";

registerChaiSaveToLibrary(({ blockId, blocks, close }) => {
  const handleSave = async (name, category) => {
    await saveBlockToLibrary({ blockId, blocks, name, category });
    close();
  };

  return (
    <div className="p-4">
      <h2>Save to Library</h2>
      <input placeholder="Block name" />
      <select>{/* Categories */}</select>
      <button onClick={handleSave}>Save</button>
      <button onClick={close}>Cancel</button>
    </div>
  );
});
```

### SaveToLibraryProps Type

```typescript
type SaveToLibraryProps = {
  blockId: string;
  blocks: ChaiBlock[];
  close: () => void;
};
```

---

## registerChaiAddBlockTab

Add custom tabs to the "Add Block" panel.

```typescript
import { registerChaiAddBlockTab } from "@chaibuilder/sdk";

registerChaiAddBlockTab("ai-blocks", {
  tab: () => <span>AI Generate</span>,
  tabContent: () => (
    <div className="p-4">
      <textarea placeholder="Describe the block you want..." />
      <button>Generate with AI</button>
    </div>
  ),
});
```

### AddBlockTab Type

```typescript
type AddBlockTab = {
  id: string;
  tab: React.ComponentType;
  tabContent: React.ComponentType;
};
```

---

## registerChaiFont

Register custom fonts for use in the theme.

```typescript
import { registerChaiFont } from "@chaibuilder/sdk/runtime";

// Via URL (Google Fonts, etc.)
registerChaiFont("Ubuntu", {
  url: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap",
  fallback: "sans-serif",
});

// Via source files
registerChaiFont("CustomFont", {
  fallback: "Arial, sans-serif",
  src: [
    { url: "/fonts/CustomFont.woff2", format: "woff2" },
    { url: "/fonts/CustomFont.woff", format: "woff" },
  ],
});
```

---

## registerChaiPreImportHTMLHook

Pre-process HTML before it's imported into the builder.

```typescript
import { registerChaiPreImportHTMLHook } from "@chaibuilder/sdk";

registerChaiPreImportHTMLHook(async (html) => {
  // Transform HTML before import
  return html.replace(/class="old-class"/g, 'class="new-class"').replace(/<font>/g, "<span>");
});
```

---

## Block Settings Extensions

Extend the block settings form with custom widgets, fields, or templates.

### registerBlockSettingWidget

```typescript
import { registerBlockSettingWidget } from "@chaibuilder/sdk";

registerBlockSettingWidget("colorGradient", ({ value, onChange }) => {
  return (
    <GradientPicker
      value={value}
      onChange={onChange}
    />
  );
});
```

Usage in block schema:

```typescript
registerChaiBlockProps({
  properties: {
    gradient: {
      type: "string",
      title: "Gradient",
      ui: { "ui:widget": "colorGradient" },
    },
  },
});
```

### registerBlockSettingField

```typescript
import { registerBlockSettingField } from "@chaibuilder/sdk";

registerBlockSettingField("customField", (props) => {
  // Full control over field rendering
  return <CustomFieldComponent {...props} />;
});
```

### registerBlockSettingTemplate

```typescript
import { registerBlockSettingTemplate } from "@chaibuilder/sdk";

registerBlockSettingTemplate("customTemplate", (props) => {
  // Custom form template
  return <CustomFormTemplate {...props} />;
});
```

---

## Feature Flags

Register custom feature flags:

```typescript
import { registerChaiFeatureFlag } from "@chaibuilder/sdk";

registerChaiFeatureFlag("myFeature", {
  value: false,
  description: "Enable my custom feature",
});

// Use in components
import { useChaiFeatureFlag, IfChaiFeatureFlag } from "@chaibuilder/sdk";

const MyComponent = () => {
  const isEnabled = useChaiFeatureFlag("myFeature");

  return (
    <IfChaiFeatureFlag flagKey="myFeature">
      <MyFeatureUI />
    </IfChaiFeatureFlag>
  );
};
```
