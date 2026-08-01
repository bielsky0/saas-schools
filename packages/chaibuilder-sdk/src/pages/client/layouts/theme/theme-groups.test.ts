import { describe, expect, it } from "vitest";
import {
  getThemeGroup,
  getThemeGroupsBySection,
  selectedThemeGroupAtom,
  THEME_COLOR_TOKEN_MAP,
  THEME_GROUP_LABELS,
  THEME_GROUPS,
  THEME_SECTIONS,
} from "./theme-groups";

describe("theme-groups", () => {
  it("exposes the three spec sections", () => {
    expect(THEME_SECTIONS.map((s) => s.id)).toEqual(["basics", "components", "brand"]);
  });

  it("defines all groups from the 3a spec", () => {
    const ids = THEME_GROUPS.map((g) => g.id);
    expect(ids).toContain("colors");
    expect(ids).toContain("typography");
    expect(ids).toContain("spacing-width");
    expect(ids).toContain("radius-shadows");
    expect(ids).toContain("buttons");
    expect(ids).toContain("form-fields");
    expect(ids).toContain("course-cards");
    expect(ids).toContain("logo-favicon");
    expect(ids).toContain("icons");
  });

  it("marks component/brand token groups as placeholders", () => {
    const placeholderIds = THEME_GROUPS.filter((g) => g.kind === "placeholder").map((g) => g.id);
    expect(placeholderIds).toEqual([
      "spacing-width",
      "buttons",
      "form-fields",
      "course-cards",
      "logo-favicon",
      "icons",
    ]);
  });

  it("groups sections correctly", () => {
    expect(getThemeGroupsBySection("basics").map((g) => g.id)).toEqual([
      "colors",
      "typography",
      "spacing-width",
      "radius-shadows",
    ]);
    expect(getThemeGroupsBySection("components").map((g) => g.id)).toEqual([
      "buttons",
      "form-fields",
      "course-cards",
    ]);
    expect(getThemeGroupsBySection("brand").map((g) => g.id)).toEqual(["logo-favicon", "icons"]);
  });

  it("looks up groups and labels by id", () => {
    expect(getThemeGroup("colors")?.kind).toBe("editor");
    expect(getThemeGroup("nope")).toBeUndefined();
    expect(THEME_GROUP_LABELS.colors).toBe("Colors");
    expect(THEME_GROUP_LABELS.buttons).toBe("Buttons");
  });

  it("maps spec color tokens to ChaiTheme keys", () => {
    expect(THEME_COLOR_TOKEN_MAP.accent).toContain("primary");
    expect(THEME_COLOR_TOKEN_MAP.text).toEqual(["foreground"]);
    expect(THEME_COLOR_TOKEN_MAP.background).toEqual(["background"]);
    expect(THEME_COLOR_TOKEN_MAP["background-alt"]).toEqual(["muted", "card"]);
  });

  it("defaults the selected group to colors", () => {
    expect(selectedThemeGroupAtom.init).toBe("colors");
  });
});
