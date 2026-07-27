import type { Block } from "payload";

export const separatorBlock: Block = {
  slug: "separator",
  admin: { group: "Treść" },
  fields: [],
};

export function SeparatorBlock() {
  return <hr className="my-8" />;
}


