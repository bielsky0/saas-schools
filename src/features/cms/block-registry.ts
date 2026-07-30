import { BLOCK_CONFIGS, CORE_BLOCK_TYPES } from "./block-configs";

export const BLOCK_REGISTRY: Record<string, unknown> = {};

export function getBlockComponent(_blockType: string): null {
  return null;
}

export function getAllBlockConfigs(): unknown[] {
  return Object.values(BLOCK_CONFIGS).map((e) => e.payloadConfig);
}

export function getCustomBlockKeys(): string[] {
  return [];
}

export function getCustomBlockEntries(): [string, unknown][] {
  return [];
}

export { isRegisteredBlock, isCoreBlock, CORE_BLOCK_TYPES } from "./block-configs";
