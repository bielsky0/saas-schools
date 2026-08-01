import { describe, expect, it } from "vitest";

import en from "../../../../packages/chaibuilder-sdk/src/core/locales/en.json";
import pl from "./pl.json";

/**
 * Editor i18n coverage tests (Faza 0.3).
 *
 * The builder UI is Polish with an English fallback: the SDK owns the English
 * catalog (en.json) and the app overrides it with a Polish bundle (pl.json)
 * through the `translations` prop. These tests keep the two in sync for the
 * keys the new BuilderLayout actually uses.
 */
const LAYOUT_KEYS = ["Sections", "Theme", "Pages", "Coming soon"];
const NEW_UI_KEYS = [
  "Publish",
  "Unpublish",
  "Generate section",
  "Search section or block",
  "Header",
  "Template",
  "Overridden",
  "Content",
  "Manual classes",
  "Active theme",
  "Theme changes apply to all pages",
  "Draft",
  "Save draft",
  "Saving",
  "Open live page",
  "Open preview in new tab",
  "Clear canvas",
  "Dark mode",
  "Data Binding",
];

describe("Editor i18n (Faza 0.3)", () => {
  it("BuilderLayout keys exist in both en.json and pl.json", () => {
    for (const key of LAYOUT_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("new UI keys exist in en.json and are translated in pl.json", () => {
    for (const key of NEW_UI_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("visible editor chrome is covered by pl.json", () => {
    const chromeKeys = ["Saved", "Unsaved", "Preview", "Settings", "Styling", "Outline", "Breakpoints"];
    for (const key of chromeKeys) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
    }
  });

  it("pl.json has no empty string values", () => {
    for (const [key, value] of Object.entries(pl)) {
      if (typeof value === "string") {
        expect(value.trim().length, `pl.json.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
