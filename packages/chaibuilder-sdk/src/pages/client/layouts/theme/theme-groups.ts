import { atom } from "jotai";

export type ThemeGroupKind = "editor" | "placeholder";

export type ThemeSectionId = "basics" | "components" | "brand";

export interface ThemeColorToken {
  key: string;
  labelKey: string;
}

export interface ThemeGroup {
  id: string;
  labelKey: string;
  section: ThemeSectionId;
  kind: ThemeGroupKind;
}

export const THEME_SECTIONS: { id: ThemeSectionId; labelKey: string }[] = [
  { id: "basics", labelKey: "Basics" },
  { id: "components", labelKey: "Components" },
  { id: "brand", labelKey: "Brand" },
];

export const THEME_GROUPS: ThemeGroup[] = [
  { id: "colors", labelKey: "Colors", section: "basics", kind: "editor" },
  { id: "typography", labelKey: "Typography", section: "basics", kind: "editor" },
  { id: "spacing-width", labelKey: "Spacing and width", section: "basics", kind: "placeholder" },
  { id: "radius-shadows", labelKey: "Radius and shadows", section: "basics", kind: "editor" },
  { id: "buttons", labelKey: "Buttons", section: "components", kind: "placeholder" },
  { id: "form-fields", labelKey: "Form fields", section: "components", kind: "placeholder" },
  { id: "course-cards", labelKey: "Course cards", section: "components", kind: "placeholder" },
  { id: "logo-favicon", labelKey: "Logo and favicon", section: "brand", kind: "placeholder" },
  { id: "icons", labelKey: "Icons", section: "brand", kind: "placeholder" },
];

export const THEME_GROUP_LABELS: Record<string, string> = THEME_GROUPS.reduce(
  (acc, group) => ({ ...acc, [group.id]: group.labelKey }),
  {},
);

/**
 * Mapping of the spec's curated color tokens to the underlying ChaiTheme color
 * keys. Kept here so the mapping is configurable and unit-testable.
 */
export const THEME_COLOR_TOKEN_MAP: Record<string, string[]> = {
  accent: ["primary", "primary-foreground"],
  text: ["foreground"],
  background: ["background"],
  "background-alt": ["muted", "card"],
};

export const getThemeGroup = (id: string): ThemeGroup | undefined => THEME_GROUPS.find((group) => group.id === id);

export const getThemeGroupsBySection = (section: ThemeSectionId): ThemeGroup[] =>
  THEME_GROUPS.filter((group) => group.section === section);

export const selectedThemeGroupAtom = atom<string>("colors");
selectedThemeGroupAtom.debugLabel = "selectedThemeGroupAtom";
