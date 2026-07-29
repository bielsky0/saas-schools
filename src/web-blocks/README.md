# ChaiBuilder Web Blocks

This directory contains the web blocks used in ChaiBuilder for creating web pages.

## `registerChaiBlock`

The `registerChaiBlock` function is a core utility in ChaiBuilder that enables developers to register custom components as blocks that can be used in the builder interface.

### Syntax

```typescript
registerChaiBlock<T>(Component, Config);
```

### Parameters

- **Component**: A React functional component that renders the block.
- **Config**: An object that defines the block's properties, behavior, and UI representation.

### Type Definition

```typescript
function registerChaiBlock<T extends Record<string, any>>(
  Component: React.FC<ChaiBlockComponentProps<T>>,
  Config: BlockConfig,
): void;
```

### The `Config` Object

The `Config` object defines essential properties for the block:

```typescript
{
  type: string;                  // Unique identifier for the block type
  label: string;                 // Display name in the builder interface
  category: string;              // Category for grouping (e.g., "core", "form")
  group: string;                 // Subgroup within the category
  icon?: React.FC<IconProps>;    // Icon component for the block
  description?: string;          // Description of the block's purpose
  blocks?: () => ChaiBlock[];    // Default children blocks when added
  canAcceptBlock?: (target: string) => boolean; // Controls which blocks can be nested
  // Schema definition (using registerChaiBlockSchema)
  props: registerChaiBlockProps({ properties: {...} })
}
```

### Example Usage

```tsx
import { registerChaiBlock, ChaiBlockComponentProps } from "~/runtime";

// 1. Define component props
export type ButtonProps = {
  text: string;
  styles: ChaiStyles;
  onClick: string;
};

// 2. Create the component
const Button = (props: ChaiBlockComponentProps<ButtonProps>) => {
  const { blockProps, text, styles } = props;

  return (
    <button {...blockProps} {...styles}>
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
  props: registerChaiBlockProps({
    properties: {
      text: {
        type: "string",
        title: "Button Text",
        default: "Click me",
      },
      styles: stylesProp(""),
      onClick: {
        type: "string",
        title: "OnClick Action",
        default: "",
      },
    },
  }),
};

// 4. Register the block
registerChaiBlock<ButtonProps>(Button, Config);
```

### Block Schema Properties

Use `registerChaiBlockSchema` to define the properties that can be edited in the builder interface:

- **Basic Types**: string, number, boolean, array, object
- **Special Types**:
  - `stylesProp("")`: For adding CSS styling
  - UI widgets: `ui: { "ui:widget": "image" | "richtext" | "color" | ... }`

### Runtime Props

Some props can be defined as runtime props, which means they will be processed during page rendering:

```typescript
{
  dataSource: {
    type: "string",
    title: "Data Source",
    runtime: true,  // This indicates a runtime prop
    default: ""
  }
}
```

## Adding Custom Blocks

To add new custom blocks:

1. Create a new file for your block in an appropriate directory
2. Define the component props interface
3. Implement the component
4. Create the configuration object
5. Export both component and config
6. Register the block in an initialization function

Refer to the existing blocks in this directory for examples and best practices.
