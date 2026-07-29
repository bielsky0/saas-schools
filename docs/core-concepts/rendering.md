# Rendering

ChaiBuilder provides APIs to render blocks outside the editor. The render API supports both client-side React and React Server Components (RSC).

## Basic Usage

```tsx
import { RenderBlocks } from "@chaibuilder/sdk/render";

function Page({ blocks }) {
  return <RenderBlocks blocks={blocks} />;
}
```

## React Server Components

The render API is RSC-compatible, making it ideal for:

- **Next.js App Router** — Render blocks in server components
- **Streaming** — Benefit from React 18 streaming capabilities
- **Performance** — Reduce client-side JavaScript bundle

```tsx
// app/page.tsx (Next.js App Router)
import { RenderBlocks } from "@chaibuilder/sdk/render";

async function getPageBlocks() {
  // Fetch blocks from your database
  return blocks;
}

export default async function Page() {
  const blocks = await getPageBlocks();
  return <RenderBlocks blocks={blocks} />;
}
```

## Props

| Prop     | Type          | Description               |
| -------- | ------------- | ------------------------- |
| `blocks` | `ChaiBlock[]` | Array of blocks to render |

## Custom Block Rendering

When you register custom blocks, you define their render component. This component is used both in the editor preview and when rendering with `RenderBlocks`.

```typescript
import { registerChaiBlock } from "@chaibuilder/sdk/runtime";

registerChaiBlock({
  type: "MyCustomBlock",
  // ... other config
  component: ({ block }) => {
    return <div>{block.content}</div>;
  },
});
```

See [Registering Custom Blocks](../registering-custom-blocks.md) for details.

## Editor vs Production

| Context    | Component           | Notes                                        |
| ---------- | ------------------- | -------------------------------------------- |
| Editor     | `ChaiBuilderEditor` | Full editing UI with drag-drop, panels, etc. |
| Production | `RenderBlocks`      | Lightweight render-only, no editor overhead  |

The `RenderBlocks` component includes only the rendering logic—no editor UI, state management, or editing capabilities—keeping your production bundle lean.
