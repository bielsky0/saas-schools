import type { Block } from "payload";

export const separatorBlock: Block = {
  slug: "separator",
  fields: [],
};

export function SeparatorBlock() {
  return <hr className="my-8" />;
}


