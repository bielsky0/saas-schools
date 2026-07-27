import type { Block } from "payload";

export const separatorBlock = {
  slug: "separator",
  admin: {
    group: "Treść",
    components: {
      Label: "/src/features/cms/admin/block-row-label#RowLabel",
    },
  },
  fields: [],
} as Block;

export function SeparatorBlock() {
  return <hr className="my-8" />;
}


