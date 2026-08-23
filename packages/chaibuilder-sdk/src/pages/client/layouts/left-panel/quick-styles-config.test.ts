import { describe, expect, it } from "vitest";
import { QUICK_STYLE_GROUPS, isQuickStyleActive, QUICK_STYLE_CONFLICT_PREFIXES } from "./quick-styles-config";

describe("quick-styles", () => {
  it("exposes friendly groups for non-technical styling", () => {
    const ids = QUICK_STYLE_GROUPS.map((g) => g.id);
    expect(ids).toContain("background");
    expect(ids).toContain("rounded");
    expect(ids).toContain("padding");
    expect(ids).toContain("margin");
    expect(ids).toContain("shadow");
    expect(ids).toContain("fontSize");
  });

  it("options within a group share a Tailwind prefix (twMerge conflict)", () => {
    for (const group of QUICK_STYLE_GROUPS) {
      const prefixes = QUICK_STYLE_CONFLICT_PREFIXES[group.id];
      expect(prefixes.length).toBeGreaterThan(0);
      for (const option of group.options) {
        expect(
          prefixes.some((p) => option.value.startsWith(p) || option.value.startsWith(`-${p}`)),
          `${option.value} does not match any conflict prefix of ${group.id}`,
        ).toBe(true);
      }
    }
  });

  it("each option has preview data for its kind", () => {
    for (const group of QUICK_STYLE_GROUPS) {
      for (const option of group.options) {
        if (group.kind === "color") expect(option.color).toBeDefined();
        if (group.kind === "radius") expect(option.radius).toBeTypeOf("number");
        if (group.kind === "spacing") expect(option.spacing).toBeTypeOf("number");
        if (group.kind === "shadow") expect(option.shadow).toBeTypeOf("string");
        if (group.kind === "text") expect(option.fontSize).toBeTypeOf("number");
      }
    }
  });

  it("detects active classes by exact match", () => {
    expect(isQuickStyleActive(["bg-white", "p-4"], "bg-white")).toBe(true);
    expect(isQuickStyleActive(["bg-white", "p-4"], "bg-gray-900")).toBe(false);
    expect(isQuickStyleActive([], "bg-white")).toBe(false);
  });
});