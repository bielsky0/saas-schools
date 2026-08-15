import type { SectionCatalog, SectionCatalogEntry, SectionCategory } from "~/types/section-catalog";

export const SECTION_CATEGORY_LABELS: Record<Exclude<SectionCategory, "all">, string> = {
  hero: "Hero",
  pricing: "Pricing",
  forms: "Forms",
  testimonials: "Testimonials",
  footers: "Footers",
  cards: "Cards",
  media: "Media",
};

/**
 * Default entries for core ChaiBuilder blocks. App-level blocks (e.g.
 * GroupTypeCard, InstructorCard) are registered by the consuming app via
 * `registerSectionCatalogEntry` so the editor stays tenant-agnostic.
 */
const DEFAULT_CATALOG_ENTRIES: SectionCatalogEntry[] = [
  { type: "Heading", labelKey: "Heading", category: "hero", role: "template", thumbnail: "auto" },
  { type: "Paragraph", labelKey: "Paragraph", category: "hero", role: "template", thumbnail: "auto" },
  { type: "Text", labelKey: "Text", category: "hero", role: "template", thumbnail: "auto" },
  { type: "RichText", labelKey: "RichText", category: "media", role: "template", thumbnail: "auto" },
  { type: "Image", labelKey: "Image", category: "media", role: "template", thumbnail: "auto" },
  { type: "Video", labelKey: "Video", category: "media", role: "template", thumbnail: "auto" },
  { type: "Button", labelKey: "Button", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Box", labelKey: "Box", category: "cards", role: "template", thumbnail: "auto" },
  { type: "Row", labelKey: "Row", category: "cards", role: "template", thumbnail: "auto" },
  { type: "Column", labelKey: "Column", category: "cards", role: "template", thumbnail: "auto" },
  { type: "List", labelKey: "List", category: "cards", role: "template", thumbnail: "auto" },
  { type: "Link", labelKey: "Link", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Form", labelKey: "Form", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Input", labelKey: "Input", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Select", labelKey: "Select", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Checkbox", labelKey: "Checkbox", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Radio", labelKey: "Radio", category: "forms", role: "template", thumbnail: "auto" },
  { type: "TextArea", labelKey: "TextArea", category: "forms", role: "template", thumbnail: "auto" },
  { type: "Divider", labelKey: "Divider", category: "cards", role: "template", thumbnail: "auto" },
  { type: "Table", labelKey: "Table", category: "cards", role: "template", thumbnail: "auto" },
];

const catalogRegistry = new Map<string, SectionCatalogEntry>();
for (const entry of DEFAULT_CATALOG_ENTRIES) {
  catalogRegistry.set(entry.type, entry);
}

export const registerSectionCatalogEntry = (entry: SectionCatalogEntry): void => {
  catalogRegistry.set(entry.type, entry);
};

export const registerSectionCatalogEntries = (entries: SectionCatalogEntry[]): void => {
  entries.forEach(registerSectionCatalogEntry);
};

export const createSectionCatalog = (entries: SectionCatalogEntry[]): SectionCatalog => {
  const byType = new Map(entries.map((entry) => [entry.type, entry]));

  return {
    getByCategory: (category) =>
      category === "all" ? entries : entries.filter((entry) => entry.category === category),
    getByType: (type) => byType.get(type),
    search: (query) => {
      const q = query.trim().toLowerCase();
      if (!q) return entries;
      return entries.filter((entry) => {
        const haystack = `${entry.labelKey} ${entry.type} ${entry.descriptionKey ?? ""}`.toLowerCase();
        return haystack.includes(q);
      });
    },
  };
};

export const getSectionCatalog = (): SectionCatalog => {
  return createSectionCatalog(Array.from(catalogRegistry.values()));
};
