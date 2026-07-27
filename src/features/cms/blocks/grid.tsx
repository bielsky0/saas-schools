import type { Block } from "payload";
import type React from "react";

import { gridColumnsClass, gapClass } from "./style-dictionary";

export const gridBlock: Block = {
  slug: "grid",
  admin: { group: "Layout" },
  fields: [
    {
      name: "columns",
      type: "number",
      defaultValue: 2,
      min: 1,
      max: 4,
      required: true,
    },
    {
      name: "gap",
      type: "select",
      options: [
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
      defaultValue: "medium",
    },
    {
      name: "cells",
      type: "array",
      fields: [
        {
          name: "blocks",
          type: "blocks",
          blocks: [],
        },
      ],
    },
  ],
};

type GridBlockProps = {
  columns: number;
  gap: string;
  cells?: { blocks?: unknown[] }[];
  renderBlock: (block: unknown, depth: number) => React.ReactNode;
  depth: number;
};

export function GridBlock({ columns, gap, cells, renderBlock, depth }: GridBlockProps) {
  return (
    <div className={`grid ${gridColumnsClass(columns)} ${gapClass(gap)}`}>
      {cells?.map((cell, i) => (
        <div key={i}>
          {cell.blocks?.map((b: unknown, j: number) => (
            <div key={j}>{renderBlock(b, depth)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}


