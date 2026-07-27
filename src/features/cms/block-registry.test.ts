import { describe, expect, it } from "vitest";

import { BLOCK_CONFIGS } from "./block-configs";

/**
 * Block registry integrity tests (Faza 30e).
 *
 * All blocks must have an `admin.group` from a fixed set of allowed values.
 * This prevents a new block from being added without being classified into
 * a group in the Payload Admin UI.
 */
const ALLOWED_GROUPS = new Set(["Layout", "Treść", "Sekcje"]);

describe("block-registry — admin.group coverage", () => {
  for (const [key, entry] of Object.entries(BLOCK_CONFIGS)) {
    it(`block "${key}" has admin.group in allowed set`, () => {
      const group = entry.payloadConfig.admin?.group;
      expect(group).toBeDefined();
      expect(typeof group).toBe("string");
      expect(ALLOWED_GROUPS.has(group as string)).toBe(true);
    });
  }
});
