import type { Block } from "payload";
import type React from "react";

export function buildColumnBlock(availableBlocks: Block[]): Block {
  return {
    slug: "column",
    admin: { group: "Layout" },
    fields: [
      {
        name: "blocks",
        type: "blocks",
        blocks: availableBlocks,
      },
    ],
  };
}

type ColumnBlockProps = {
  blocks?: unknown[];
  renderBlock: (block: unknown, depth: number) => React.ReactNode;
  depth: number;
};

export function ColumnBlock({ blocks, renderBlock, depth }: ColumnBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      {blocks?.map((b, i) => (
        <div key={i}>{renderBlock(b, depth)}</div>
      ))}
    </div>
  );
}


