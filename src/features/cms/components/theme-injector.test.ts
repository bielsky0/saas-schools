import { describe, expect, it } from "vitest";
import { getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import type { ChaiTheme } from "@chaibuilder/sdk/types";

function makeTheme(overrides?: Partial<ChaiTheme>): ChaiTheme {
  return {
    fontFamily: { heading: "Inter", body: "system-ui" },
    borderRadius: "0.5rem",
    colors: {
      background: ["#FFFFFF", "#121212"],
      foreground: ["#0A0A0B", "#FAFAFA"],
      primary: ["#2563eb", "#2563eb"],
      "primary-foreground": ["#FFFFFF", "#FFFFFF"],
      secondary: ["#8b5cf6", "#8b5cf6"],
      "secondary-foreground": ["#FFFFFF", "#FFFFFF"],
      muted: ["#F4F4F5", "#374151"],
      "muted-foreground": ["#71717A", "#9CA3AF"],
      accent: ["#F4F4F5", "#374151"],
      "accent-foreground": ["#18181B", "#FFFFFF"],
      destructive: ["#DC2626", "#EF4444"],
      "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
      border: ["#E4E4E7", "#374151"],
      input: ["#E4E4E7", "#374151"],
      ring: ["#2563eb", "#2563eb"],
      card: ["#FFFFFF", "#242424"],
      "card-foreground": ["#0A0A0B", "#FAFAFA"],
      popover: ["#FFFFFF", "#242424"],
      "popover-foreground": ["#0A0A0B", "#FAFAFA"],
    },
    ...overrides,
  };
}

describe("getChaiThemeCssVariables", () => {
  it("includes --radius from theme.borderRadius", () => {
    const theme = makeTheme({ borderRadius: "30px" });
    const css = getChaiThemeCssVariables({ theme });
    expect(css).toContain("--radius: 30px");
  });

  it("falls back to a value when borderRadius is set to 0.5rem", () => {
    const theme = makeTheme({ borderRadius: "0.5rem" });
    const css = getChaiThemeCssVariables({ theme });
    expect(css).toContain("--radius: 0.5rem");
  });

  it("generates --font-{heading,body} from theme.fontFamily", () => {
    const theme = makeTheme();
    const css = getChaiThemeCssVariables({ theme });
    expect(css).toContain("--font-heading");
    expect(css).toContain("--font-body");
  });

  it("converts hex colors to HSL format (no hex values in output)", () => {
    const theme = makeTheme();
    const css = getChaiThemeCssVariables({ theme });
    expect(css).toContain("--primary:");
    expect(css).toContain("--secondary:");
    expect(css).toContain("--background:");
    expect(css).not.toContain("--color-primary:");
    expect(css).not.toContain("#2563eb");
  });

  it("generates both :root and .dark blocks", () => {
    const theme = makeTheme();
    const css = getChaiThemeCssVariables({ theme });
    expect(css).toContain(":root");
    expect(css).toContain(".dark");
  });
});
