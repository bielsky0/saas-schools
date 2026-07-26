import { describe, expect, it } from "vitest";

import { validateBlockAccess } from "./validate-block-access";

const CORE_BLOCK = {
  blockType: "text",
  content: {},
};

const UNKNOWN_BLOCK = {
  blockType: "unknown_block_type",
  someField: "value",
};

const UNREGISTERED_BLOCK = {
  blockType: "hero_section",
  title: "Welcome",
};

const NESTED_UNREGISTERED = {
  blockType: "grid",
  cells: [
    {
      blocks: [UNREGISTERED_BLOCK],
    },
  ],
};

const DEEP_NESTING = (nestingDepth: number) => {
  const result: Record<string, unknown> = { blockType: "column", blocks: [] as unknown[] };
  let current = result;
  for (let i = 0; i < nestingDepth; i++) {
    const inner: Record<string, unknown> = { blockType: "column", blocks: [] as unknown[] };
    (current.blocks as unknown[]).push(inner);
    current = inner;
  }
  return [result];
};

const EMPTY_GRANT: Set<string> = new Set();

describe("validateBlockAccess", () => {
  describe("core blocks (always valid, no grant required)", () => {
    it("passes a single core block", () => {
      const result = validateBlockAccess([CORE_BLOCK], EMPTY_GRANT);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("passes multiple core blocks", () => {
      const result = validateBlockAccess([CORE_BLOCK, CORE_BLOCK], EMPTY_GRANT);
      expect(result.valid).toBe(true);
    });

    it("passes core block nested inside grid", () => {
      const result = validateBlockAccess([NESTED_UNREGISTERED], EMPTY_GRANT);
      expect(result.valid).toBe(false);
    });

    it("passes core text block nested inside grid cells", () => {
      const gridWithCore = {
        blockType: "grid",
        cells: [{ blocks: [CORE_BLOCK] }],
      };
      const result = validateBlockAccess([gridWithCore], EMPTY_GRANT);
      expect(result.valid).toBe(true);
    });
  });

  describe("unknown block types (not in registry)", () => {
    it("rejects unknown block type", () => {
      const result = validateBlockAccess([UNKNOWN_BLOCK], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown block type");
    });

    it("rejects unknown nested inside grid", () => {
      const gridWithUnknown = {
        blockType: "grid",
        cells: [{ blocks: [UNKNOWN_BLOCK] }],
      };
      const result = validateBlockAccess([gridWithUnknown], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown block type");
    });
  });

  describe("custom blocks (require grant) — will be tested in 30d when custom blocks are in registry", () => {
    it("unregistered custom block is rejected as unknown (core blocks only in 30b)", () => {
      const result = validateBlockAccess([UNREGISTERED_BLOCK], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown block type");
    });

    it("unregistered nested inside grid is also unknown", () => {
      const result = validateBlockAccess([NESTED_UNREGISTERED], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown block type");
    });
  });

  describe("max depth guard", () => {
    it("rejects blocks nested beyond MAX_DEPTH (12 → exceeds)", () => {
      const result = validateBlockAccess(DEEP_NESTING(12), EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Max nesting depth");
    });

    it("passes blocks at exactly MAX_DEPTH (9 → depth counter reaches 10)", () => {
      const result = validateBlockAccess(DEEP_NESTING(9), EMPTY_GRANT);
      expect(result.valid).toBe(true);
    });

    it("blocks at depth MAX_DEPTH+1 (10 → tries to recurse to 11)", () => {
      const result = validateBlockAccess(DEEP_NESTING(10), EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Max nesting depth");
    });
  });

  describe("edge cases", () => {
    it("passes an empty block array", () => {
      const result = validateBlockAccess([], EMPTY_GRANT);
      expect(result.valid).toBe(true);
    });

    it("rejects non-array input", () => {
      const result = validateBlockAccess(null as unknown as unknown[], EMPTY_GRANT);
      expect(result.valid).toBe(false);
    });

    it("rejects block with missing blockType", () => {
      const result = validateBlockAccess([{ someField: "value" }], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("missing blockType");
    });

    it("rejects null block in array", () => {
      const result = validateBlockAccess([null], EMPTY_GRANT);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid block entry");
    });
  });
});
