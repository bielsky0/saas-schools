import type { Block } from "payload";
import type React from "react";

import { gridColumnsClass, gapClass } from "./style-dictionary";

export function buildGridBlock(availableBlocks: Block[]): Block {
  return {
    slug: "grid",
    admin: {
      group: "Layout",
      components: {
        Label: "/src/features/cms/admin/block-row-label#RowLabel",
      },
    },
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
            blocks: availableBlocks,
            admin: {
              components: {
                Field:
                  "/src/features/cms/components/drawer-blocks-field.client#DrawerBlocksField",
              },
            },
          },
        ],
      },
    ],
  } as Block;
}

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


