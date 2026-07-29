import { flatten, get, keys, uniqBy } from "lodash-es";
import { getAllRegisteredFonts } from "~/runtime";
import type { ChaiFontBySrc, ChaiFontByUrl } from "~/types";
import type { ChaiTheme, ChaiThemeOptions } from "~/types/chaibuilder-editor-props";

export const getChaiThemeOptions = (chaiThemeOptions: ChaiThemeOptions) => {
  const theme = {
    fontFamily: chaiThemeOptions.fontFamily
      ? keys(chaiThemeOptions.fontFamily).reduce(
          (acc, key) => ({
            ...acc,
            [key.replace("font-", "")]: `var(--${key})`,
          }),
          {},
        )
      : {},
    borderRadius: chaiThemeOptions.borderRadius
      ? {
          lg: `var(--radius)`,
          md: `calc(var(--radius) - 2px)`,
          sm: `calc(var(--radius) - 4px)`,
        }
      : {},
    colors: chaiThemeOptions.colors
      ? flatten(chaiThemeOptions.colors.map((color) => Object.entries(color.items))).reduce(
          (acc, [key]) => ({ ...acc, [key]: `hsl(var(--${key}))` }),
          {},
        )
      : {},
  };
  return theme;
};

export function hexToHSL(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  let r = parseInt(result![1], 16);
  let g = parseInt(result![2], 16);
  let b = parseInt(result![3], 16);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  ((r /= 255), (g /= 255), (b /= 255));
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max == min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const getFontFamily = (font: string) => {
  const registeredFonts = getAllRegisteredFonts();
  const chaiFont = registeredFonts.find((f) => f.family === font);
  return `"${font}", ${get(chaiFont, "fallback", "")}`;
};

export const getChaiThemeCssVariables = ({ theme }: { theme: ChaiTheme }) => {
  const chaiTheme = theme;
  return `:root {
    ${
      theme.fontFamily
        ? Object.entries(theme.fontFamily)
            .map(([key, value]) => `--font-${key}: ${getFontFamily(value)};`)
            .join("\n    ")
        : ""
    }
    ${chaiTheme.borderRadius ? `--radius: ${chaiTheme.borderRadius};` : ""}
    ${
      chaiTheme.colors
        ? Object.entries(chaiTheme.colors)
            .map(([key, value]) => `--${key}: ${hexToHSL(value[0])};`)
            .join("\n    ")
        : ""
    }
  }
  .dark {
    ${
      chaiTheme.colors
        ? Object.entries(chaiTheme.colors)
            .map(([key, value]) => `--${key}: ${hexToHSL(value[1])};`)
            .join("\n    ")
        : ""
    }
  }`;
};

export const getThemeFontsLinkMarkup = (fonts: ChaiFontByUrl[]) => {
  if (!fonts || fonts.length === 0) return "";

  return uniqBy(fonts, "family")
    .map((font: ChaiFontByUrl) => `<link rel="stylesheet" href="${font.url}" />`)
    .join("\n");
};

export const getThemeFontsUrls = (fonts: ChaiFontByUrl[]) => {
  if (!fonts || fonts.length === 0) return [];

  return uniqBy(fonts, "family").map((font: ChaiFontByUrl) => font.url);
};

export const getThemeFontsCSSImport = (fonts: ChaiFontByUrl[]) => {
  if (!fonts || fonts.length === 0) return "";

  return uniqBy(fonts, "family")
    .map((font: ChaiFontByUrl) => `@import url("${font.url}");`)
    .join("\n");
};

export const getThemeCustomFontFace = (fonts: ChaiFontBySrc[]) => {
  if (!fonts || fonts.length === 0) return "";

  return uniqBy(fonts, "family")
    .map((font: ChaiFontBySrc) =>
      font.src
        .map(
          (source) => `@font-face {
        font-family: "${font.family}";
        src: url("${source.url}") format("${source.format}");
        font-display: swap;
        ${source.fontWeight ? `font-weight: ${source.fontWeight};` : ""}
        ${source.fontStyle ? `font-style: ${source.fontStyle};` : ""}
        ${source.fontStretch ? `font-stretch: ${source.fontStretch};` : ""}
      }`,
        )
        .join("\n"),
    )
    .join("\n");
};
