import { describe, expect, it } from "vitest";

import { createThemeSchema, updateThemeSchema } from "./schema";

describe("createThemeSchema validation", () => {
  it("accepts valid theme input", () => {
    const result = createThemeSchema.safeParse({
      fontPrimary: "system-ui",
      fontHeading: "Inter",
      colorPrimary: "#2563eb",
      colorSecondary: "#8b5cf6",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty fontPrimary", () => {
    const result = createThemeSchema.safeParse({
      fontPrimary: "",
      fontHeading: "Inter",
      colorPrimary: "#2563eb",
      colorSecondary: "#8b5cf6",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fontPrimary over 100 chars", () => {
    const result = createThemeSchema.safeParse({
      fontPrimary: "x".repeat(101),
      fontHeading: "Inter",
      colorPrimary: "#2563eb",
      colorSecondary: "#8b5cf6",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty colorPrimary", () => {
    const result = createThemeSchema.safeParse({
      fontPrimary: "system-ui",
      fontHeading: "Inter",
      colorPrimary: "",
      colorSecondary: "#8b5cf6",
    });
    expect(result.success).toBe(false);
  });

  it("rejects colorPrimary over 50 chars", () => {
    const result = createThemeSchema.safeParse({
      fontPrimary: "system-ui",
      fontHeading: "Inter",
      colorPrimary: "x".repeat(51),
      colorSecondary: "#8b5cf6",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateThemeSchema validation", () => {
  it("accepts partial update with only colorPrimary", () => {
    const result = updateThemeSchema.safeParse({
      colorPrimary: "#ff0000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateThemeSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
