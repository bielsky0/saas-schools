import { describe, expect, it } from "vitest";
import { isMobileWidth, MOBILE_BREAKPOINT } from "./use-is-mobile";

describe("use-is-mobile", () => {
  it("treats widths below the breakpoint as mobile", () => {
    expect(MOBILE_BREAKPOINT).toBe(768);
    expect(isMobileWidth(0)).toBe(true);
    expect(isMobileWidth(390)).toBe(true);
    expect(isMobileWidth(767)).toBe(true);
  });

  it("treats widths at or above the breakpoint as desktop", () => {
    expect(isMobileWidth(768)).toBe(false);
    expect(isMobileWidth(1024)).toBe(false);
    expect(isMobileWidth(1920)).toBe(false);
  });
});
