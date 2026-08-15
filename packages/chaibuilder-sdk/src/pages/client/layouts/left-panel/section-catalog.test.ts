import { describe, expect, it } from "vitest";
import type { SectionCatalogEntry } from "~/types/section-catalog";
import {
  createSectionCatalog,
  getSectionCatalog,
  registerSectionCatalogEntries,
  registerSectionCatalogEntry,
  SECTION_CATEGORY_LABELS,
} from "./section-catalog";

const entries: SectionCatalogEntry[] = [
  { type: "GroupTypeCard", labelKey: "Course card", category: "cards", role: "template", thumbnail: "auto" },
  { type: "InstructorCard", labelKey: "Instructor", category: "cards", role: "template", thumbnail: "auto" },
  { type: "UpcomingEvents", labelKey: "Upcoming events", category: "cards", role: "template" },
  { type: "BookingButton", labelKey: "Booking button", category: "forms", role: "template" },
];

const catalog = createSectionCatalog(entries);

describe("createSectionCatalog", () => {
  it("returns all entries for the 'all' category", () => {
    expect(catalog.getByCategory("all")).toHaveLength(entries.length);
  });

  it("filters by category", () => {
    expect(catalog.getByCategory("cards").map((e) => e.type)).toEqual([
      "GroupTypeCard",
      "InstructorCard",
      "UpcomingEvents",
    ]);
    expect(catalog.getByCategory("forms").map((e) => e.type)).toEqual(["BookingButton"]);
    expect(catalog.getByCategory("hero")).toEqual([]);
  });

  it("looks up by type", () => {
    expect(catalog.getByType("GroupTypeCard")?.role).toBe("template");
    expect(catalog.getByType("missing")).toBeUndefined();
  });

  it("searches case-insensitively across label, type and description", () => {
    expect(catalog.search("course").map((e) => e.type)).toEqual(["GroupTypeCard"]);
    expect(catalog.search("CARD").map((e) => e.type)).toEqual([
      "GroupTypeCard",
      "InstructorCard",
    ]);
    expect(catalog.search("booking").map((e) => e.type)).toEqual(["BookingButton"]);
    expect(catalog.search("")).toHaveLength(entries.length);
    expect(catalog.search("zzz")).toEqual([]);
  });

  it("uses the label key when description is missing", () => {
    const withDescription = createSectionCatalog([
      { ...entries[0], descriptionKey: "A nice course card" },
    ]);
    expect(withDescription.search("nice").map((e) => e.type)).toEqual(["GroupTypeCard"]);
  });
});

describe("registerSectionCatalogEntry", () => {
  it("seeds the singleton catalog with default core entries", () => {
    const singleton = getSectionCatalog();
    expect(singleton.getByType("Heading")?.role).toBe("template");
    expect(singleton.getByType("Button")?.category).toBe("forms");
    expect(singleton.getByType("Navbar")).toBeUndefined();
  });

  it("registers and later overrides entries by type", () => {
    registerSectionCatalogEntry({
      type: "GroupTypeCard",
      labelKey: "Course card",
      category: "pricing",
      role: "template",
    });
    expect(getSectionCatalog().getByType("GroupTypeCard")?.category).toBe("pricing");

    registerSectionCatalogEntry({
      type: "GroupTypeCard",
      labelKey: "Course card",
      category: "cards",
      role: "template",
    });
    expect(getSectionCatalog().getByType("GroupTypeCard")?.category).toBe("cards");
  });

  it("registerSectionCatalogEntries registers many entries at once", () => {
    registerSectionCatalogEntries([
      { type: "AlphaBlock", labelKey: "Alpha", category: "hero", role: "template" },
      { type: "BetaBlock", labelKey: "Beta", category: "media", role: "footer" },
    ]);
    const singleton = getSectionCatalog();
    expect(singleton.getByType("AlphaBlock")?.category).toBe("hero");
    expect(singleton.getByType("BetaBlock")?.role).toBe("footer");
  });
});

describe("SECTION_CATEGORY_LABELS", () => {
  it("maps spec categories to display labels", () => {
    expect(SECTION_CATEGORY_LABELS.hero).toBe("Hero");
    expect(SECTION_CATEGORY_LABELS.pricing).toBe("Pricing");
    expect(SECTION_CATEGORY_LABELS.forms).toBe("Forms");
    expect(SECTION_CATEGORY_LABELS.testimonials).toBe("Testimonials");
    expect(SECTION_CATEGORY_LABELS.footers).toBe("Footers");
    expect(SECTION_CATEGORY_LABELS.cards).toBe("Cards");
    expect(SECTION_CATEGORY_LABELS.media).toBe("Media");
  });
});
