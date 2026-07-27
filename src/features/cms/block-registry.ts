import type { Block } from "payload";

import {
  AccordionBlock,
  ButtonBlock,
  ColumnBlock,
  GridBlock,
  HeroSection,
  ImageBlock,
  PricingTable,
  ScheduleGrid,
  SeparatorBlock,
  TextBlock,
  ContactForm,
} from "./blocks";
import type { BlockComponent } from "./blocks/types";
import { BLOCK_CONFIGS, CORE_BLOCK_TYPES } from "./block-configs";

type RegistryEntry = {
  type: "core" | "custom";
  payloadConfig: Block;
  component: BlockComponent;
  featureKey?: string;
};

function buildRegistry(): Record<string, RegistryEntry> {
  const registry: Record<string, RegistryEntry> = {};
  for (const [key, config] of Object.entries(BLOCK_CONFIGS)) {
    const component = COMPONENT_MAP[key];
    if (!component) continue;
    registry[key] = { ...config, component };
  }
  return registry;
}

const COMPONENT_MAP: Record<string, BlockComponent> = {
  grid: GridBlock,
  column: ColumnBlock,
  text: TextBlock,
  button: ButtonBlock,
  image: ImageBlock,
  separator: SeparatorBlock,
  accordion: AccordionBlock,
  hero_section: HeroSection,
  pricing_table: PricingTable,
  contact_form: ContactForm,
  schedule_grid: ScheduleGrid,
};

export const BLOCK_REGISTRY: Record<string, RegistryEntry> = buildRegistry();

export function getBlockComponent(blockType: string): BlockComponent | null {
  const entry = BLOCK_REGISTRY[blockType];
  return entry ? entry.component : null;
}

export function getAllBlockConfigs(): Block[] {
  return Object.values(BLOCK_CONFIGS).map((e) => e.payloadConfig);
}

export function getCustomBlockKeys(): string[] {
  return Object.entries(BLOCK_CONFIGS)
    .filter(([, e]) => e.type === "custom")
    .map(([key]) => key);
}

export function getCustomBlockEntries(): [string, RegistryEntry][] {
  return Object.entries(BLOCK_REGISTRY).filter(([, e]) => e.type === "custom");
}

export { isRegisteredBlock, isCoreBlock, CORE_BLOCK_TYPES } from "./block-configs";
