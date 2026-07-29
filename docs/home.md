# ChaiBuilder SDK Documentation

Welcome to the ChaiBuilder SDK documentation. ChaiBuilder is a powerful visual page builder SDK for React applications.

## Quick Links

- [Introduction](./introduction.md)
- [Getting Started](./getting-started.md)
- [Editor Props Reference](./editor-props-reference.md)
- [Registering Custom Blocks](./registering-custom-blocks.md)
- [Theme Presets](./theme-presets.md)
- [Extensions API](./extensions-api.md)
- [Hooks Reference](./hooks-reference.md)
- [Permissions](./permissions.md)
- [Feature Flags](./feature-flags.md)
- [Types Reference](./types-reference.md)

## Installation

```bash
npm install @chaibuilder/sdk
# or
yarn add @chaibuilder/sdk
# or
pnpm add @chaibuilder/sdk
```

## Basic Usage

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";

function App() {
  return (
    <ChaiBuilderEditor
      blocks={[]}
      onSave={async ({ blocks, theme }) => {
        console.log("Saving:", blocks, theme);
        return true;
      }}
    />
  );
}
```

## Key Features

- **Visual Page Builder** - Drag-and-drop interface for building pages
- **Custom Blocks** - Register your own block types
- **Theme System** - Configurable theme with presets and dark mode support
- **Extensible** - Add custom panels, media managers, libraries, and more
- **Permissions** - Fine-grained permission control
- **i18n Support** - Built-in internationalization
- **Undo/Redo** - Full history management
