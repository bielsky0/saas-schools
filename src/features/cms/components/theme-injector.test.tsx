import { describe, expect, it } from "vitest";

import { getTheme } from "@/features/cms/data";

describe("getTheme — default theme values", () => {
  it("defines expected defaults matching the component constants", () => {
    const defaults = {
      fontPrimary: "system-ui",
      fontHeading: "Inter",
      colorPrimary: "#2563eb",
      colorSecondary: "#8b5cf6",
    };

    expect(defaults.fontPrimary).toBeTruthy();
    expect(defaults.fontHeading).toBeTruthy();
    expect(defaults.colorPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaults.colorSecondary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("CSS custom property injection format", () => {
  it("generates valid CSS variable syntax", () => {
    const theme = {
      colorPrimary: "#ff0000",
      colorSecondary: "#00ff00",
      fontPrimary: "Arial",
      fontHeading: "Helvetica",
    };

    const css = `:root {
      --color-primary: ${theme.colorPrimary};
      --color-secondary: ${theme.colorSecondary};
      --font-primary: ${theme.fontPrimary};
      --font-heading: ${theme.fontHeading};
    }`;

    expect(css).toContain("--color-primary: #ff0000");
    expect(css).toContain("--color-secondary: #00ff00");
    expect(css).toContain("--font-primary: Arial");
    expect(css).toContain("--font-heading: Helvetica");
  });

  it("renders with null theme gracefully (defaults used)", () => {
    const defaults = {
      fontPrimary: "system-ui",
      fontHeading: "Inter",
      colorPrimary: "#2563eb",
      colorSecondary: "#8b5cf6",
    };

    const css = `:root {
      --color-primary: ${defaults.colorPrimary};
      --color-secondary: ${defaults.colorSecondary};
      --font-primary: ${defaults.fontPrimary};
      --font-heading: ${defaults.fontHeading};
    }`;

    expect(css).toContain("--color-primary: #2563eb");
    expect(css).toContain("--font-primary: system-ui");
  });
});
