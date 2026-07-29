# Getting Started

This guide will help you set up ChaiBuilder SDK in your React application.

## Prerequisites

- React 18+
- Node.js 16+

## Installation

```bash
npm install @chaibuilder/sdk
# or
yarn add @chaibuilder/sdk
# or
pnpm add @chaibuilder/sdk
```

## Basic Setup

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";
import "@chaibuilder/sdk/styles"; // Import styles

function PageEditor() {
  const [blocks, setBlocks] = useState([]);

  const handleSave = async ({ blocks, theme, designTokens }) => {
    // Save to your backend
    await saveToDatabase({ blocks, theme, designTokens });
    return true; // Return true on success, Error on failure
  };

  return <ChaiBuilderEditor blocks={blocks} onSave={handleSave} autoSave={true} />;
}
```

## With Theme Configuration

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";

const myTheme = {
  fontFamily: {
    heading: "Arial",
    body: "Arial",
  },
  borderRadius: "8px",
  colors: {
    background: ["#ffffff", "#0a0a0a"],
    foreground: ["#0a0a0a", "#fafafa"],
    primary: ["#3b82f6", "#60a5fa"],
    // ... other colors
  },
};

function PageEditor() {
  return (
    <ChaiBuilderEditor
      blocks={[]}
      theme={myTheme}
      themePresets={[{ my_theme: myTheme }]}
      onSave={async (data) => true}
    />
  );
}
```

## With User & Permissions

```tsx
<ChaiBuilderEditor
  blocks={[]}
  user={{
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
    avatar: "https://example.com/avatar.jpg",
    role: "editor",
  }}
  permissions={["add_block", "delete_block", "edit_block", "edit_theme", "save_page"]}
  onSave={async (data) => true}
/>
```

## Next Steps

- [Editor Props Reference](./Editor-Props-Reference.md) - All available props
- [Registering Custom Blocks](./Registering-Custom-Blocks.md) - Create custom blocks
- [Theme Presets](./Theme-Presets.md) - Configure themes
- [Extensions API](./Extensions-API.md) - Extend the builder
