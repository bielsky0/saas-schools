import { describe, expect, it } from "vitest";
import type { SectionCategory } from "~/types/section-catalog";
import {
  BLOCK_PICKER_CATEGORY_ORDER,
  createBlockCatalog,
  createSectionPickerCategories,
  filterPickerCategories,
  getBlockPickerCategory,
  getSectionPickerCategory,
  registerBlockPickerCategory,
  SECTION_PICKER_CATEGORY_ORDER,
  type SectionPickerCategoryId,
  type SectionPickerSource,
} from "./picker-categories";

describe("getSectionPickerCategory", () => {
  const cases: [SectionCategory, SectionPickerCategoryId][] = [
    ["hero", "Banery"],
    ["media", "Narracja"],
    ["pricing", "Produkty"],
    ["forms", "Formularze"],
    ["testimonials", "Narracja"],
    ["footers", "Układ"],
    ["cards", "Kolekcje"],
  ];

  it.each(cases)("maps %s to %s", (category, expected) => {
    expect(getSectionPickerCategory({ category } as SectionPickerSource)).toBe(expected);
  });

  it("prefers the explicit pickerCategory override", () => {
    expect(
      getSectionPickerCategory({ category: "cards", pickerCategory: "Produkty" } as SectionPickerSource),
    ).toBe("Produkty");
  });

  it("falls back to Układ for unknown categories", () => {
    expect(getSectionPickerCategory({ category: "unknown" as SectionCategory } as SectionPickerSource)).toBe("Układ");
  });
});

describe("getBlockPickerCategory", () => {
  it("maps core groups to the Shopify taxonomy", () => {
    expect(getBlockPickerCategory("Heading", "typography")).toBe("Podstawowe");
    expect(getBlockPickerCategory("Button", "form")).toBe("Formularze");
    expect(getBlockPickerCategory("Box", "layout")).toBe("Układ");
    expect(getBlockPickerCategory("Image", "media")).toBe("Podstawowe");
  });

  it("falls back to Podstawowe for unknown groups", () => {
    expect(getBlockPickerCategory("MysteryBlock", "Langlion")).toBe("Podstawowe");
  });

  it("uses the per-type registry override before the group mapping", () => {
    registerBlockPickerCategory("OverrideBlock", "Produkt");
    expect(getBlockPickerCategory("OverrideBlock", "typography")).toBe("Produkt");
  });
});

describe("createSectionPickerCategories", () => {
  it("groups entries and keeps the spec category order", () => {
    const categories = createSectionPickerCategories([
      { type: "Hero", labelKey: "Hero", category: "hero" },
      { type: "Heading", labelKey: "Heading", category: "hero" },
      { type: "ContactForm", labelKey: "Contact form", category: "forms" },
    ] as SectionPickerSource[]);

    expect(categories.map((c) => c.id)).toEqual(["Banery", "Formularze"]);
    expect(categories[0].items.map((i) => i.type)).toEqual(["Hero", "Heading"]);
    expect(categories[1].items.map((i) => i.type)).toEqual(["ContactForm"]);
  });

  it("skips categories with no entries and honours explicit overrides", () => {
    const categories = createSectionPickerCategories([
      { type: "CourseCard", labelKey: "Course card", category: "cards", pickerCategory: "Produkty" },
    ] as SectionPickerSource[]);
    expect(categories.map((c) => c.id)).toEqual(["Produkty"]);
    expect(categories[0].items[0].role).toBeUndefined();
  });

  it("carries the section role for icon rendering", () => {
    const categories = createSectionPickerCategories([
      { type: "Navbar", labelKey: "Navbar", category: "hero", role: "header" },
    ] as SectionPickerSource[]);
    expect(categories[0].items[0].role).toBe("header");
  });
});

describe("createBlockCatalog", () => {
  const blocks = [
    { type: "Heading", label: "Heading", group: "typography" },
    { type: "Button", label: "Button", group: "form" },
    { type: "Box", label: "Box", group: "layout" },
    { type: "GroupTypeCard", label: "Course card", group: "Langlion" },
  ];

  it("groups blocks and keeps the spec category order", () => {
    const categories = createBlockCatalog(blocks);
    expect(categories.map((c) => c.id)).toEqual(["Formularze", "Podstawowe", "Układ"]);
  });

  it("drops hidden blocks and blocks rejected by canAddBlock", () => {
    const categories = createBlockCatalog(
      [...blocks, { type: "Hidden", label: "Hidden", group: "layout", hidden: true }],
      "Section",
      (type) => type !== "Button",
    );
    const types = categories.flatMap((c) => c.items.map((i) => i.type));
    expect(types).not.toContain("Hidden");
    expect(types).not.toContain("Button");
  });

  it("returns an empty list when nothing is acceptable", () => {
    const categories = createBlockCatalog(blocks, "Section", () => false);
    expect(categories).toEqual([]);
  });
});

describe("filterPickerCategories", () => {
  const categories = createSectionPickerCategories([
    { type: "Hero", labelKey: "Hero", category: "hero" },
    { type: "ContactForm", labelKey: "Contact form", category: "forms" },
  ] as SectionPickerSource[]);

  it("returns the same reference for an empty query", () => {
    expect(filterPickerCategories(categories, "  ")).toBe(categories);
  });

  it("filters items case-insensitively across label and type", () => {
    const hero = filterPickerCategories(categories, "HERO");
    expect(hero.map((c) => c.id)).toEqual(["Banery"]);
    expect(hero[0].items.map((i) => i.type)).toEqual(["Hero"]);

    const form = filterPickerCategories(categories, "contact");
    expect(form.map((c) => c.id)).toEqual(["Formularze"]);
  });

  it("drops categories that no longer match", () => {
    expect(filterPickerCategories(categories, "zzz")).toEqual([]);
  });

  it("declares the expected category order", () => {
    expect(SECTION_PICKER_CATEGORY_ORDER[0]).toBe("Banery");
    expect(BLOCK_PICKER_CATEGORY_ORDER[0]).toBe("Dekoracyjne");
    expect(BLOCK_PICKER_CATEGORY_ORDER[BLOCK_PICKER_CATEGORY_ORDER.length - 1]).toBe("Układ");
  });
});