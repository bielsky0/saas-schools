import type { Block } from "payload";

import {
  AccordionBlock,
  ButtonBlock,
  ColumnBlock,
  GridBlock,
  ImageBlock,
  SeparatorBlock,
  TextBlock,
  accordionBlock,
  buttonBlock,
  columnBlock,
  gridBlock,
  imageBlock,
  separatorBlock,
  textBlock,
} from "./blocks";
import type { BlockComponent } from "./blocks/types";

type RegistryEntry = {
  type: "core" | "custom";
  payloadConfig: Block;
  component: BlockComponent;
};

export const BLOCK_REGISTRY: Record<string, RegistryEntry> = {
  grid: { type: "core", payloadConfig: gridBlock, component: GridBlock },
  column: { type: "core", payloadConfig: columnBlock, component: ColumnBlock },
  text: { type: "core", payloadConfig: textBlock, component: TextBlock },
  button: { type: "core", payloadConfig: buttonBlock, component: ButtonBlock },
  image: { type: "core", payloadConfig: imageBlock, component: ImageBlock },
  separator: { type: "core", payloadConfig: separatorBlock, component: SeparatorBlock },
  accordion: { type: "core", payloadConfig: accordionBlock, component: AccordionBlock },
};

export const CORE_BLOCK_TYPES: ReadonlySet<string> = new Set(
  Object.values(BLOCK_REGISTRY)
    .filter((e) => e.type === "core")
    .map((e) => e.payloadConfig.slug),
);

export function isRegisteredBlock(blockType: string): boolean {
  return blockType in BLOCK_REGISTRY;
}

export function isCoreBlock(blockType: string): boolean {
  const entry = BLOCK_REGISTRY[blockType];
  return entry !== undefined && entry.type === "core";
}

export function getBlockComponent(blockType: string): BlockComponent | null {
  const entry = BLOCK_REGISTRY[blockType];
  return entry ? entry.component : null;
}

export function getAllBlockConfigs(): Block[] {
  return Object.values(BLOCK_REGISTRY).map((e) => e.payloadConfig);
}
