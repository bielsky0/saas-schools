import type { Block } from "payload"

/**
 * Wraps a block config with an additional `hidden` checkbox field.
 * The field is hidden from the form UI (controlled by the eye icon in the
 * block list) but stored in the block's data so CmsRenderer can skip it.
 *
 * No migration needed — blocks are stored as jsonb (blocksAsJSON: true).
 */
export function withHiddenField(block: Block): Block {
  return {
    ...block,
    fields: [
      {
        name: "hidden",
        type: "checkbox",
        defaultValue: false,
        admin: {
          hidden: true,
        },
      },
      ...block.fields,
    ],
  }
}
