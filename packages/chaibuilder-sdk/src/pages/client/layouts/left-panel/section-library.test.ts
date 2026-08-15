import { describe, expect, it } from "vitest";
import type { SectionCatalogEntry, SectionCategory } from "~/types/section-catalog";
import { createSectionCatalog } from "./section-catalog";
import { getLibraryEntries } from "./section-library";

const entries: SectionCatalogEntry[] = [
  { type: "Heading", labelKey: "Heading", category: "hero", role: "template" },
  { type: "GroupTypeCard", labelKey: "Course card", category: "cards", role: "template" },
  { type: "BookingButton", labelKey: "Booking button", category: "forms", role: "template" },
  { type: "FooterNav", labelKey: "Footer nav", category: "footers", role: "footer" },
];

const catalog = createSectionCatalog(entries);

describe("getLibraryEntries", () => {
  it("returns all entries for the 'all' category when query is empty", () => {
    const result = getLibraryEntries(catalog, "all", "");
    expect(result).toHaveLength(entries.length);
  });

  it("filters by the selected category when query is empty", () => {
    const cards = getLibraryEntries(catalog, "cards", "");
    expect(cards.map((e) => e.type)).toEqual(["GroupTypeCard"]);

    const hero = getLibraryEntries(catalog, "hero", "");
    expect(hero.map((e) => e.type)).toEqual(["Heading"]);
  });

  it("lets the search query override the selected category", () => {
    const result = getLibraryEntries(catalog, "cards", "booking");
    expect(result.map((e) => e.type)).toEqual(["BookingButton"]);
  });

  it("is whitespace-insensitive on the query", () => {
    const result = getLibraryEntries(catalog, "hero", "   ");
    expect(result.map((e) => e.type)).toEqual(["Heading"]);
  });

  it("returns an empty list when the search matches nothing", () => {
    expect(getLibraryEntries(catalog, "all", "zzz")).toEqual([]);
  });

  it("accepts every SectionCategory without throwing", () => {
    const categories: SectionCategory[] = [
      "all",
      "hero",
      "pricing",
      "forms",
      "testimonials",
      "footers",
      "cards",
      "media",
    ];
    for (const category of categories) {
      const result = getLibraryEntries(catalog, category, "");
      expect(Array.isArray(result)).toBe(true);
    }
  });
});
