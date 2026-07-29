# Registering Custom Blocks

Learn how to create and register custom blocks for the ChaiBuilder editor.

## Overview

The `registerChaiBlock` function enables you to register custom React components as blocks that can be used in the builder interface.

## Basic Syntax

```typescript
import { registerChaiBlock } from "@chaibuilder/sdk/runtime";

registerChaiBlock(Component, Config);
```

## Complete Example

```tsx
import {
  registerChaiBlock,
  registerChaiBlockProps,
  ChaiBlockComponentProps,
  ChaiStyles,
  stylesProp,
} from "@chaibuilder/sdk/runtime";

// 1. Define component props
type ButtonProps = {
  text: string;
  styles: ChaiStyles;
  variant: "primary" | "secondary" | "outline";
};

// 2. Create the component
const Button = (props: ChaiBlockComponentProps<ButtonProps>) => {
  const { blockProps, text, styles, variant = "primary" } = props;

  return (
    <button {...blockProps} {...styles} data-variant={variant}>
      {text}
    </button>
  );
};

// 3. Define the configuration
const Config = {
  type: "Button",
  label: "Button",
  category: "core",
  group: "basic",
  description: "A clickable button element",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      text: {
        type: "string",
        title: "Button Text",
        default: "Click me",
      },
      variant: {
        type: "string",
        title: "Variant",
        default: "primary",
        oneOf: [
          { const: "primary", title: "Primary" },
          { const: "secondary", title: "Secondary" },
          { const: "outline", title: "Outline" },
        ],
      },
    },
  }),
};

// 4. Register the block
registerChaiBlock(Button, Config);
```

## Config Object Reference

| Property         | Type                          | Required | Description                                  |
| ---------------- | ----------------------------- | -------- | -------------------------------------------- |
| `type`           | `string`                      | Yes      | Unique identifier for the block type         |
| `label`          | `string`                      | Yes      | Display name in the builder                  |
| `category`       | `string`                      | Yes      | Category for grouping (e.g., "core", "form") |
| `group`          | `string`                      | Yes      | Subgroup within the category                 |
| `description`    | `string`                      | No       | Description of the block                     |
| `icon`           | `React.FC`                    | No       | Icon component                               |
| `blocks`         | `() => ChaiBlock[]`           | No       | Default children when added                  |
| `canAcceptBlock` | `(target: string) => boolean` | No       | Controls which blocks can be nested          |

## Component Props

Your component receives `ChaiBlockComponentProps<T>` which includes:

```typescript
type ChaiBlockComponentProps<T> = {
  blockProps: Record<string, string>; // Required props for the block element
  children?: React.ReactNode; // Nested blocks
  inBuilder: boolean; // True when in editor, false in preview
  draft: boolean; // True when in draft mode
  lang: string; // Current language
} & T; // Your custom props
```

**Important**: Always spread `blockProps` on your root element:

```tsx
const MyBlock = ({ blockProps, children }) => {
  return <div {...blockProps}>{children}</div>;
};
```

## Schema Properties

Use `registerChaiBlockProps` to define editable properties. The schema follows [React JSON Schema Form (RJSF) v5](https://rjsf-team.github.io/react-jsonschema-form/docs/version-5.24.10/) format:

### Basic Types

```typescript
registerChaiBlockProps({
  properties: {
    // String
    title: {
      type: "string",
      title: "Title",
      default: "Hello",
    },

    // Number
    count: {
      type: "number",
      title: "Count",
      default: 0,
    },

    // Boolean
    isVisible: {
      type: "boolean",
      title: "Visible",
      default: true,
    },

    // Enum (dropdown)
    size: {
      type: "string",
      title: "Size",
      default: "medium",
      oneOf: [
        { const: "small", title: "Small" },
        { const: "medium", title: "Medium" },
        { const: "large", title: "Large" },
      ],
    },
  },
});
```

### Styles Property

Always include styles for visual customization:

```typescript
import { StylesProp } from "@chaibuilder/sdk/runtime";

registerChaiBlockProps({
  properties: {
    styles: StylesProp(""), // Empty string or default Tailwind classes
  },
});
```

### UI Widgets

Special input types for the editor:

```typescript
registerChaiBlockProps({
  properties: {
    // Image picker
    image: {
      type: "string",
      title: "Image",
      default: "",
      ui: { "ui:widget": "image" },
    },

    // Rich text editor
    content: {
      type: "string",
      title: "Content",
      default: "",
      ui: { "ui:widget": "richtext" },
    },

    // Color picker
    color: {
      type: "string",
      title: "Color",
      default: "#000000",
      ui: { "ui:widget": "color" },
    },
  },
});
```

### Runtime Props

Props processed during page rendering (not in editor):

```typescript
registerChaiBlockProps({
  properties: {
    dataSource: {
      type: "string",
      title: "Data Source",
      runtime: true,
      default: "",
    },
  },
});
```

## Accepting Child Blocks

Control which blocks can be nested inside your block:

```typescript
const Config = {
  type: "Container",
  // ... other config

  // Accept all blocks
  canAcceptBlock: () => true,

  // Accept specific blocks
  canAcceptBlock: (blockType: string) => {
    return ["Text", "Image", "Button"].includes(blockType);
  },

  // Accept no blocks (leaf node)
  canAcceptBlock: () => false,
};
```

## Default Children

Provide default nested blocks when the block is added:

```typescript
const Config = {
  type: "Card",
  // ... other config

  blocks: () => [
    {
      _id: "card-title",
      _type: "Heading",
      content: "Card Title",
      tag: "h3",
    },
    {
      _id: "card-body",
      _type: "Paragraph",
      content: "Card content goes here.",
    },
  ],
};
```

## Block with Container

Example of a block that contains other blocks:

```tsx
import EmptySlot from "@chaibuilder/sdk/empty-slot";

const Card = ({ blockProps, children, inBuilder, styles }) => {
  return (
    <div {...blockProps} {...styles}>
      {children || <EmptySlot inBuilder={inBuilder} />}
    </div>
  );
};

const Config = {
  type: "Card",
  label: "Card",
  category: "core",
  group: "layout",
  canAcceptBlock: () => true,
  props: registerChaiBlockProps({
    properties: {
      styles: StylesProp("p-4 border rounded-lg"),
    },
  }),
};
```

## HTML Tag Selection

Allow users to choose the HTML tag:

```typescript
registerChaiBlockProps({
  properties: {
    tag: {
      type: "string",
      title: "HTML Tag",
      default: "div",
      oneOf: [
        { const: "div", title: "div" },
        { const: "section", title: "section" },
        { const: "article", title: "article" },
        { const: "aside", title: "aside" },
        { const: "header", title: "header" },
        { const: "footer", title: "footer" },
      ],
    },
  },
});
```

Then use `React.createElement`:

```tsx
const Box = ({ blockProps, tag = "div", children, styles }) => {
  return React.createElement(tag, { ...blockProps, ...styles }, children);
};
```

## Best Practices

1. **Unique Type Names**: Use unique, descriptive type names
2. **Always Spread blockProps**: Required for editor functionality
3. **Handle inBuilder**: Conditionally render editor-only UI
4. **Provide Defaults**: Set sensible defaults for all properties
5. **Use StylesProp**: Enable visual styling for all blocks
6. **Empty States**: Use `EmptySlot` for container blocks without children
