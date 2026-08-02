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

const SECTIONS_TAB_KEYS = [
  "Add section",
  "Generate section from description",
  "Generate",
  "Generating...",
  "Describe the section you want to generate and add it to the page",
  "e.g. A hero section with a headline, subheading and a call to action button",
  "Feature under construction",
  "Section generated",
  "Footer",
  "No sections",
  "No sections found",
  "This page is empty",
  "Get started by adding your first block to begin building your page",
  "Something went wrong",
];

const THEME_TAB_KEYS = [
  "Basics",
  "Components",
  "Brand",
  "Colors",
  "Typography",
  "Spacing and width",
  "Radius and shadows",
  "Buttons",
  "Form fields",
  "Course cards",
  "Logo and favicon",
  "Icons",
  "Change",
  "Dark",
  "Light",
  "Select preset",
  "Select font",
  "Toggle dark mode",
  "Border Radius",
  "Theme updated",
  "Shadows coming soon",
  "Sections can override the background locally — the section name shows an overridden badge in the tree",
];

const PAGES_TAB_KEYS = [
  "Templates",
  "System pages",
  "Live",
  "General",
  "SEO",
  "Access",
  "Page name",
  "Visible in menu",
  "Indexed in Google",
  "Search engine preview",
  "SEO Title",
  "SEO Description",
  "Canonical URL",
  "Publication status",
  "This page is live on your website",
  "This page is a draft",
  "Password protected",
  "Select a page to view its settings",
  "Mark as template",
  "Unmark as template",
  "Add Page",
  "Add new page to start",
  "Empty List!",
  "Search pages",
  "CMS Collections",
  "All posts",
  "Status live",
  "Status draft",
  "Status archived",
];

const RIGHT_PANEL_KEYS = [
  "Advanced",
  "Select a block or page",
  "Select a block on the canvas or a page from the Pages tab to edit its settings",
  "Advanced (CSS classes)",
  "Custom code",
  "Custom code coming soon",
  "Visibility",
  "Conditional Visibility",
  "Enter a JavaScript expression",
];

const MOBILE_KEYS = [
  "Back",
  "Block",
  "Name",
  "Hide",
  "Delete section",
  "Add block",
  "Blocks in section",
  "MORE",
  "Theme settings",
  "Live preview",
  "Inspector",
  "Enabled",
  "Disabled",
  "Block settings",
  "Nothing selected",
  "blocks",
  "Menu",
  "Block actions",
  "No blocks",
  "Done",
  "Undo / Redo",
  "Editor",
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

  it("Sections tab (Faza 2) keys exist in en.json and are translated in pl.json", () => {
    for (const key of SECTIONS_TAB_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("Theme tab (Faza 3) keys exist in en.json and are translated in pl.json", () => {
    for (const key of THEME_TAB_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("Pages tab (Faza 4) keys exist in en.json and are translated in pl.json", () => {
    for (const key of PAGES_TAB_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("Right panel (Faza 5) keys exist in en.json and are translated in pl.json", () => {
    for (const key of RIGHT_PANEL_KEYS) {
      expect(en, `en.json missing "${key}"`).toHaveProperty(key);
      expect(pl, `pl.json missing "${key}"`).toHaveProperty(key);
      expect(pl[key as keyof typeof pl]).toBeTruthy();
    }
  });

  it("Mobile editor (Faza 6) keys exist in en.json and are translated in pl.json", () => {
    for (const key of MOBILE_KEYS) {
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
