/**
 * Payload block configs only — no React component imports.
 *
 * This file exists so that block-registry.ts can import components,
 * while pure-logic consumers (validate-block-access, tests) can
 * import just the type/config info without pulling in React, DB, or env.
 *
 * Grid and Column are container blocks whose children are ALL registered
 * blocks (including themselves for nested layouts). To avoid a circular
 * dependency (block-configs → grid → block-configs), grid.tsx and
 * column.tsx export factory functions that take the available blocks list
 * as a parameter. This file is the single orchestrator that builds the
 * full list in two steps:
 *   1. atoms — atomic blocks that never nest (text, button, image, …)
 *   2. containers — grid and column built with the full list including
 *      themselves, then exported via BLOCK_CONFIGS
 */
import type { Block } from "payload";

import { withHiddenField } from "./blocks/utils";
import { accordionBlock } from "./blocks/accordion";
import { buttonBlock } from "./blocks/button";
import { imageBlock } from "./blocks/image";
import { separatorBlock } from "./blocks/separator";
import { textBlock } from "./blocks/text";
import { buildGridBlock } from "./blocks/grid";
import { buildColumnBlock } from "./blocks/column";
import { heroSectionBlock } from "./blocks/hero-section-block";
import { pricingTableBlock } from "./blocks/pricing-table-block";
import { contactFormBlock } from "./blocks/contact-form-block";
import { scheduleGridBlock } from "./blocks/schedule-grid-block";

export type BlockConfigEntry = {
  type: "core" | "custom";
  payloadConfig: Block;
  featureKey?: string;
};

// Step 1: atomic blocks — never nest other blocks
const atomBlocks: Block[] = [
  textBlock,
  buttonBlock,
  imageBlock,
  separatorBlock,
  accordionBlock,
];

// Step 2: container blocks built with only atoms first, then rebuilt
// with the full list (including themselves) for recursive nesting.
// This two-step approach avoids a circular import: grid/column never
// import block-configs, they receive blocks as a function parameter.
const gridBlock = buildGridBlock(atomBlocks);
const columnBlock = buildColumnBlock(atomBlocks);
const allBlocks = [...atomBlocks, gridBlock, columnBlock];

export const BLOCK_CONFIGS: Record<string, BlockConfigEntry> = {
  grid: { type: "core", payloadConfig: withHiddenField(buildGridBlock(allBlocks)) },
  column: { type: "core", payloadConfig: withHiddenField(buildColumnBlock(allBlocks)) },
  text: { type: "core", payloadConfig: withHiddenField(textBlock) },
  button: { type: "core", payloadConfig: withHiddenField(buttonBlock) },
  image: { type: "core", payloadConfig: withHiddenField(imageBlock) },
  separator: { type: "core", payloadConfig: withHiddenField(separatorBlock) },
  accordion: { type: "core", payloadConfig: withHiddenField(accordionBlock) },
  // Custom blocks — require tenant_block_access grant
  hero_section: {
    type: "custom",
    featureKey: "block_hero_section",
    payloadConfig: withHiddenField(heroSectionBlock),
  },
  pricing_table: {
    type: "custom",
    featureKey: "block_pricing_table",
    payloadConfig: withHiddenField(pricingTableBlock),
  },
  contact_form: {
    type: "custom",
    featureKey: "block_contact_form",
    payloadConfig: withHiddenField(contactFormBlock),
  },
  schedule_grid: {
    type: "custom",
    featureKey: "block_schedule_grid",
    payloadConfig: withHiddenField(scheduleGridBlock),
  },
};

export const CORE_BLOCK_TYPES: ReadonlySet<string> = new Set(
  Object.values(BLOCK_CONFIGS)
    .filter((e) => e.type === "core")
    .map((e) => e.payloadConfig.slug),
);

export function isRegisteredBlock(blockType: string): boolean {
  return blockType in BLOCK_CONFIGS;
}

export function isCoreBlock(blockType: string): boolean {
  const entry = BLOCK_CONFIGS[blockType];
  return entry !== undefined && entry.type === "core";
}

export function getAllBlockConfigs(): Block[] {
  return Object.values(BLOCK_CONFIGS).map((e) => e.payloadConfig);
}

export function getCustomBlockKeys(): string[] {
  return Object.entries(BLOCK_CONFIGS)
    .filter(([, e]) => e.type === "custom")
    .map(([key]) => key);
}
