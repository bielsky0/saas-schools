# Blocks

Blocks are the fundamental building units in ChaiBuilder. Every element on a page—from containers to text, images, and custom components—is represented as a block.

## Block Structure

Each block is a JSON object with the following core properties:

| Property  | Type                          | Description                                   |
| --------- | ----------------------------- | --------------------------------------------- |
| `_id`     | `string`                      | Unique identifier for the block               |
| `_type`   | `string`                      | Block type (e.g., `Box`, `Text`, `Image`)     |
| `_parent` | `string \| null \| undefined` | ID of the parent block (null for root blocks) |
| `_name`   | `string \| null \| undefined` | Optional display name of the block            |

Additional properties vary by block type.

## Example Block

```json
{
  "_id": "abc123",
  "_type": "Box",
  "_parent": null,
  "_name": "Box",
  "styles": "#styles:,p-4 bg-white rounded-lg shadow"
}
```

## Block Types

ChaiBuilder includes several built-in block types:

- **Box** — Container element for layout
- **Text** — Rich text content
- **Heading** — Heading elements (h1-h6)
- **Image** — Image with src, alt, and sizing
- **Link** — Anchor elements
- **Button** — Clickable buttons
- **Icon** — SVG icons
- **Video** — Video embeds
- **Custom HTML** — Raw HTML content

## Nested Blocks

Blocks can be nested to create complex layouts. Child blocks reference their parent via the `_parent` property:

```json
[
  {
    "_id": "container-1",
    "_type": "Box",
    "_parent": null,
    "styles": "#styles:,flex gap-4"
  },
  {
    "_id": "text-1",
    "_type": "Text",
    "_parent": "container-1",
    "content": "Hello World",
    "styles": "#styles:,text-red-500"
  }
]
```

## Working with Blocks

### In the Editor

Use hooks to manipulate blocks programmatically:

```typescript
import { useAddBlock, useRemoveBlocks, useUpdateBlocksProps } from "@chaibuilder/sdk";
```

See [Hooks Reference](../hooks-reference.md) for the complete API.

### Custom Blocks

You can register your own block types with custom properties and rendering logic. See [Registering Custom Blocks](../registering-custom-blocks.md).
