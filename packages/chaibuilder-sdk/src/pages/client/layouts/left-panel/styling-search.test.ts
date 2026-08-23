import { describe, expect, it } from "vitest";
import { filterStylingSections, itemMatches } from "./styling-search";

const t = (key: string) =>
  ({
    Styles: "Styles",
    "layout.heading": "Layout",
    "layout.margin": "Margin",
    "layout.padding": "Padding",
    "background.heading": "Background",
    "typography.heading": "Typography",
    "typography.align": "Alignment",
    "effect.heading": "Effects",
  })[key] ?? key;

const sections = [
  {
    heading: "Styles",
    items: [
      { type: "arbitrary", label: "layout.width", property: "width" },
      { type: "arbitrary", label: "layout.height", property: "height" },
      {
        styleType: "multiple",
        label: "layout.margin",
        options: [{ key: "margin", label: "layout.margin_all" }],
      },
      {
        styleType: "multiple",
        label: "layout.padding",
        options: [{ key: "padding", label: "layout.padding_all" }],
      },
      {
        styleType: "accordion",
        heading: "typography.heading",
        items: [{ type: "dropdown", property: "textAlign", label: "typography.align" }],
      },
    ],
  },
  { heading: "background.heading", items: [{ type: "color", label: "background.bgcolor", property: "backgroundColor" }] },
  { heading: "effect.heading", items: [] },
];

describe("styling-search", () => {
  it("returns the same reference for an empty query", () => {
    expect(filterStylingSections(sections, "  ", t)).toBe(sections);
  });

  it("keeps the whole section when the heading matches", () => {
    const result = filterStylingSections(sections, "Background", t);
    expect(result.map((s) => s.heading)).toEqual(["background.heading"]);
    expect(result[0].items).toHaveLength(1);
  });

  it("filters items when only an item label matches", () => {
    const result = filterStylingSections(sections, "Padding", t);
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("Styles");
    expect(result[0].items.map((i) => i.label)).toEqual(["layout.padding"]);
  });

  it("keeps an accordion item when a nested label matches", () => {
    expect(itemMatches(sections[0].items[4], "Alignment", t)).toBe(true);
    expect(itemMatches(sections[0].items[4], "Typography", t)).toBe(true);
  });

  it("returns no sections when nothing matches", () => {
    expect(filterStylingSections(sections, "zzz", t)).toEqual([]);
  });

  it("drops empty sections after filtering", () => {
    const result = filterStylingSections(sections, "Margin", t);
    expect(result.every((s) => s.items.length > 0)).toBe(true);
  });
});