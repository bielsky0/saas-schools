/**
 * Payload block configs only — no React component imports.
 *
 * This file exists so that block-registry.ts can import components,
 * while pure-logic consumers (validate-block-access, tests) can
 * import just the type/config info without pulling in React, DB, or env.
 */
import type { Block } from "payload";

import { accordionBlock } from "./blocks/accordion";
import { buttonBlock } from "./blocks/button";
import { columnBlock } from "./blocks/column";
import { gridBlock } from "./blocks/grid";
import { imageBlock } from "./blocks/image";
import { separatorBlock } from "./blocks/separator";
import { textBlock } from "./blocks/text";
import { heroSectionBlock } from "./blocks/hero-section-block";
import { pricingTableBlock } from "./blocks/pricing-table-block";
import { contactFormBlock } from "./blocks/contact-form-block";
import { scheduleGridBlock } from "./blocks/schedule-grid-block";

export type BlockConfigEntry = {
  type: "core" | "custom";
  payloadConfig: Block;
  featureKey?: string;
};

export const BLOCK_CONFIGS: Record<string, BlockConfigEntry> = {
  grid: { type: "core", payloadConfig: gridBlock },
  column: { type: "core", payloadConfig: columnBlock },
  text: { type: "core", payloadConfig: textBlock },
  button: { type: "core", payloadConfig: buttonBlock },
  image: { type: "core", payloadConfig: imageBlock },
  separator: { type: "core", payloadConfig: separatorBlock },
  accordion: { type: "core", payloadConfig: accordionBlock },
  // Custom blocks — require tenant_block_access grant
  hero_section: {
    type: "custom",
    featureKey: "block_hero_section",
    payloadConfig: heroSectionBlock,
  },
  pricing_table: {
    type: "custom",
    featureKey: "block_pricing_table",
    payloadConfig: pricingTableBlock,
  },
  contact_form: {
    type: "custom",
    featureKey: "block_contact_form",
    payloadConfig: contactFormBlock,
  },
  schedule_grid: {
    type: "custom",
    featureKey: "block_schedule_grid",
    payloadConfig: scheduleGridBlock,
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
