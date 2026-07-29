# Hooks Reference

ChaiBuilder exports numerous hooks for building custom UI and extensions.

## Block Management

### useBlocksStore

Access the blocks state store.

```typescript
import { useBlocksStore } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [blocks, setBlocks] = useBlocksStore();
  // blocks: ChaiBlock[]
};
```

### useAddBlock

Add new blocks to the canvas.

```typescript
import { useAddBlock } from "@chaibuilder/sdk";

const MyComponent = () => {
  const addBlock = useAddBlock();

  const handleAdd = () => {
    addBlock({
      _id: "unique-id",
      _type: "Box",
      styles: "p-4 bg-gray-100",
    });
  };
};
```

### useRemoveBlocks

Remove blocks from the canvas.

```typescript
import { useRemoveBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const removeBlocks = useRemoveBlocks();

  const handleDelete = (blockIds: string[]) => {
    removeBlocks(blockIds);
  };
};
```

### useDuplicateBlocks

Duplicate selected blocks.

```typescript
import { useDuplicateBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const duplicateBlocks = useDuplicateBlocks();

  const handleDuplicate = () => {
    duplicateBlocks(); // Duplicates currently selected blocks
  };
};
```

### useUpdateBlocksProps

Update properties of blocks.

```typescript
import { useUpdateBlocksProps } from "@chaibuilder/sdk";

const MyComponent = () => {
  const updateBlocksProps = useUpdateBlocksProps();

  const handleUpdate = () => {
    updateBlocksProps([
      { _id: "block-1", content: "New content" },
      { _id: "block-2", styles: "p-8" },
    ]);
  };
};
```

### useReplaceBlock

Replace a block with another.

```typescript
import { useReplaceBlock } from "@chaibuilder/sdk";

const MyComponent = () => {
  const replaceBlock = useReplaceBlock();

  const handleReplace = () => {
    replaceBlock("old-block-id", {
      _id: "new-block-id",
      _type: "NewBlockType",
    });
  };
};
```

---

## Selection

### useSelectedBlock

Get the currently selected block.

```typescript
import { useSelectedBlock } from "@chaibuilder/sdk";

const MyComponent = () => {
  const selectedBlock = useSelectedBlock();
  // selectedBlock: ChaiBlock | null
};
```

### useSelectedBlockIds

Get/set selected block IDs.

```typescript
import { useSelectedBlockIds } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [selectedIds, setSelectedIds] = useSelectedBlockIds();
  // selectedIds: string[]

  const selectBlock = (id: string) => {
    setSelectedIds([id]);
  };
};
```

### useHighlightBlockId

Highlight a block (hover effect).

```typescript
import { useHighlightBlockId } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [highlightId, setHighlightId] = useHighlightBlockId();

  const handleHover = (blockId: string) => {
    setHighlightId(blockId);
  };
};
```

### useBlockHighlight

Control block highlighting.

```typescript
import { useBlockHighlight } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { highlight, clearHighlight } = useBlockHighlight();

  highlight("block-id");
  clearHighlight();
};
```

---

## Styling

### useAddClassesToBlocks

Add CSS classes to blocks.

```typescript
import { useAddClassesToBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const addClasses = useAddClassesToBlocks();

  const handleAddClass = () => {
    addClasses(["block-1", "block-2"], "bg-blue-500 text-white");
  };
};
```

### useRemoveClassesFromBlocks

Remove CSS classes from blocks.

```typescript
import { useRemoveClassesFromBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const removeClasses = useRemoveClassesFromBlocks();

  const handleRemoveClass = () => {
    removeClasses(["block-1"], "bg-blue-500");
  };
};
```

### useSelectedBlockCurrentClasses

Get classes for the selected block at current breakpoint.

```typescript
import { useSelectedBlockCurrentClasses } from "@chaibuilder/sdk";

const MyComponent = () => {
  const classes = useSelectedBlockCurrentClasses();
  // classes: string[]
};
```

### useSelectedBlockAllClasses

Get all classes for the selected block across all breakpoints.

```typescript
import { useSelectedBlockAllClasses } from "@chaibuilder/sdk";

const MyComponent = () => {
  const allClasses = useSelectedBlockAllClasses();
  // allClasses: string[]
};
```

### useStylingBreakpoint

Get/set the current styling breakpoint.

```typescript
import { useStylingBreakpoint } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [breakpoint, setBreakpoint] = useStylingBreakpoint();
  // breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
};
```

### useStylingState

Get/set the current styling state (hover, focus, etc.).

```typescript
import { useStylingState } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [state, setState] = useStylingState();
  // state: "" | "hover" | "focus" | "active" | etc.
};
```

---

## Theme

### useTheme

Get/set theme values.

```typescript
import { useTheme } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [theme, setTheme] = useTheme();

  const updatePrimaryColor = (color: string) => {
    setTheme({
      ...theme,
      colors: {
        ...theme.colors,
        primary: [color, theme.colors.primary[1]],
      },
    });
  };
};
```

### useThemeOptions

Get available theme options.

```typescript
import { useThemeOptions } from "@chaibuilder/sdk";

const MyComponent = () => {
  const options = useThemeOptions();
  // options: ChaiBuilderThemeOptions
};
```

### useDarkMode

Toggle dark mode.

```typescript
import { useDarkMode } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [isDark, setIsDark] = useDarkMode();

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };
};
```

---

## Canvas & Preview

### usePreviewMode

Toggle preview mode.

```typescript
import { usePreviewMode } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [isPreview, setIsPreview] = usePreviewMode();

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };
};
```

### useCanvasZoom

Control canvas zoom level.

```typescript
import { useCanvasZoom } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [zoom, setZoom] = useCanvasZoom();
  // zoom: number (0.5 to 2)
};
```

### useCanvasWidth

Get/set canvas width.

```typescript
import { useCanvasWidth } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [width, setWidth] = useCanvasWidth();
};
```

### useSelectedBreakpoints

Get selected breakpoints.

```typescript
import { useSelectedBreakpoints } from "@chaibuilder/sdk";

const MyComponent = () => {
  const breakpoints = useSelectedBreakpoints();
};
```

---

## Clipboard

### useCopyBlockIds

Copy blocks to clipboard.

```typescript
import { useCopyBlockIds } from "@chaibuilder/sdk";

const MyComponent = () => {
  const copyBlocks = useCopyBlockIds();

  const handleCopy = () => {
    copyBlocks(["block-1", "block-2"]);
  };
};
```

### useCutBlockIds

Cut blocks to clipboard.

```typescript
import { useCutBlockIds } from "@chaibuilder/sdk";

const MyComponent = () => {
  const cutBlocks = useCutBlockIds();

  const handleCut = () => {
    cutBlocks(["block-1"]);
  };
};
```

### usePasteBlocks

Paste blocks from clipboard.

```typescript
import { usePasteBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const pasteBlocks = usePasteBlocks();

  const handlePaste = () => {
    pasteBlocks();
  };
};
```

---

## Utility

### useSavePage

Trigger page save.

```typescript
import { useSavePage } from "@chaibuilder/sdk";

const MyComponent = () => {
  const savePage = useSavePage();

  const handleSave = async () => {
    await savePage();
  };
};
```

### useUndoManager

Access undo/redo functionality.

```typescript
import { useUndoManager } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { undo, redo, canUndo, canRedo } = useUndoManager();
};
```

### usePermissions

Check user permissions.

```typescript
import { usePermissions } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { hasPermission } = usePermissions();

  if (!hasPermission("edit_block")) {
    return <div>No permission to edit</div>;
  }
};
```

### useBuilderProp

Access builder props.

```typescript
import { useBuilderProp } from "@chaibuilder/sdk";

const MyComponent = () => {
  const user = useBuilderProp("user");
  const autoSave = useBuilderProp("autoSave", false);
};
```

### useTranslation

Access i18n translations.

```typescript
import { useTranslation } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { t } = useTranslation();

  return <button>{t("Save")}</button>;
};
```

### useLanguages

Get available languages.

```typescript
import { useLanguages } from "@/core/hooks/use-languages";

const MyComponent = () => {
  const languages = useLanguages();
  // languages: string[]
};
```

### useCurrentPage

Get current page info.

```typescript
import { useCurrentPage } from "@chaibuilder/sdk";

const MyComponent = () => {
  const page = useCurrentPage();
};
```

### useHtmlToBlocks

Convert HTML to blocks.

```typescript
import { useHtmlToBlocks } from "@chaibuilder/sdk";

const MyComponent = () => {
  const htmlToBlocks = useHtmlToBlocks();

  const handleImport = async (html: string) => {
    const blocks = await htmlToBlocks(html);
  };
};
```

### usePubSub

Publish/subscribe to events.

```typescript
import { usePubSub } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { publish, subscribe } = usePubSub();

  useEffect(() => {
    const unsubscribe = subscribe("my-event", (data) => {
      console.log("Event received:", data);
    });
    return unsubscribe;
  }, []);

  const handleClick = () => {
    publish("my-event", { foo: "bar" });
  };
};
```
