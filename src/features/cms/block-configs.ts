export type BlockConfigEntry = {
  type: "core" | "custom";
  payloadConfig: unknown;
  featureKey?: string;
};

export const BLOCK_CONFIGS: Record<string, BlockConfigEntry> = {};

export const CORE_BLOCK_TYPES: ReadonlySet<string> = new Set();

export function isRegisteredBlock(_blockType: string): boolean {
  return false;
}

export function isCoreBlock(_blockType: string): boolean {
  return false;
}

export function getAllBlockConfigs(): unknown[] {
  return [];
}

export function getCustomBlockKeys(): string[] {
  return [];
}
