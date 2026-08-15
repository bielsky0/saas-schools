import { describe, expect, it } from "vitest";
import { componentTokensToCssVars } from "~/render/component-tokens";

describe("componentTokensToCssVars", () => {
  it("serializes tokens into a :root CSS block", () => {
    const css = componentTokensToCssVars({ "--cmp-btn-radius": "8px", "--cmp-field-height": "40px" });
    expect(css).toContain(":root {");
    expect(css).toContain("--cmp-btn-radius: 8px;");
    expect(css).toContain("--cmp-field-height: 40px;");
  });

  it("skips empty or non-string values", () => {
    const css = componentTokensToCssVars({ "--cmp-btn-radius": "", "--cmp-field-height": "  ", "--cmp-btn-height": "40px" });
    expect(css).not.toContain("--cmp-btn-radius");
    expect(css).not.toContain("--cmp-field-height");
    expect(css).toContain("--cmp-btn-height: 40px;");
  });

  it("returns an empty string for no tokens", () => {
    expect(componentTokensToCssVars({})).toBe("");
  });

  it("returns an empty string when only empty values are present", () => {
    expect(componentTokensToCssVars({ "--cmp-btn-radius": "   " })).toBe("");
  });
});
