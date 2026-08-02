import { describe, expect, it } from "vitest";
import { defaultThemeOptions } from "~/hooks/default-theme-options";

/**
 * QA guard for the editor chrome palette (spec 2a): declared fg/bg token pairs
 * must meet at least WCAG AA "large text / UI components" contrast (3:1) in both
 * light (index 0) and dark (index 1) variants.
 */
function luminance(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  const [r, g, b] = [1, 2, 3].map((i) => {
    const c = parseInt(match[i], 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const MIN_CONTRAST = 3;

describe("editor chrome theme contrast (spec 2a)", () => {
  it("light variant (index 0) fg/bg pairs meet 3:1", () => {
    const groups = [
      ["background", "foreground"],
      ["primary", "primary-foreground"],
      ["secondary", "secondary-foreground"],
      ["muted", "muted-foreground"],
      ["accent", "accent-foreground"],
      ["destructive", "destructive-foreground"],
      ["card", "card-foreground"],
      ["popover", "popover-foreground"],
    ];

    for (const [bgKey, fgKey] of groups) {
      const group = defaultThemeOptions.colors.find((g) => g.items[bgKey]);
      if (!group || !group.items[fgKey]) continue;

      const bg = group.items[bgKey][0];
      const fg = group.items[fgKey][0];
      const ratio = contrastRatio(fg, bg);

      expect(
        ratio,
        `light ${fgKey} on ${bgKey} (${fg}/${bg}) contrast ${ratio.toFixed(2)}:1 is below ${MIN_CONTRAST}:1`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it("dark variant (index 1) fg/bg pairs meet 3:1", () => {
    const groups = [
      ["background", "foreground"],
      ["primary", "primary-foreground"],
      ["secondary", "secondary-foreground"],
      ["muted", "muted-foreground"],
      ["accent", "accent-foreground"],
      ["destructive", "destructive-foreground"],
      ["card", "card-foreground"],
      ["popover", "popover-foreground"],
    ];

    for (const [bgKey, fgKey] of groups) {
      const group = defaultThemeOptions.colors.find((g) => g.items[bgKey]);
      if (!group || !group.items[fgKey]) continue;

      const bg = group.items[bgKey][1];
      const fg = group.items[fgKey][1];
      const ratio = contrastRatio(fg, bg);

      expect(
        ratio,
        `dark ${fgKey} on ${bgKey} (${fg}/${bg}) contrast ${ratio.toFixed(2)}:1 is below ${MIN_CONTRAST}:1`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
