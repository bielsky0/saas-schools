/**
 * Section catalog types — metadata registry that maps ChaiBuilder block
 * types to Shopify-style section categories and layout roles.
 *
 * Used for:
 *  - grouping sections into Header / Template / Footer (§4.1)
 *  - the section library tabs + search (§6, Phase 3)
 *  - hover-preview thumbnails (§2.3)
 */

export type SectionRole = "header" | "template" | "footer";

export type SectionCategory =
  | "all"
  | "hero"
  | "pricing"
  | "forms"
  | "testimonials"
  | "footers"
  | "cards"
  | "media";

export type SectionPickerCategoryId =
  | "Banery"
  | "Formularze"
  | "Kolekcje"
  | "Narracja"
  | "Produkty"
  | "Tekst"
  | "Układ"
  | "Biblioteka";

export interface SectionCatalogEntry {
  /** `_type` of the block, e.g. "GroupTypeCard", "Hero". */
  type: string;
  /** i18n key for the section name. */
  labelKey: string;
  category: SectionCategory;
  /** Layout role used for Header/Template/Footer grouping. */
  role: SectionRole;
  descriptionKey?: string;
  /** "auto" renders a thumbnail from the block default props; a URL uses it directly. */
  thumbnail?: string | "auto";
  /** Optional override for the Section Picker category (defaults to a mapping of `category`). */
  pickerCategory?: SectionPickerCategoryId;
}

export interface SectionCatalog {
  /** All entries for a category ("all" returns everything). */
  getByCategory(category: SectionCategory): SectionCatalogEntry[];
  getByType(type: string): SectionCatalogEntry | undefined;
  /** Case-insensitive search over label, type and description keys. */
  search(query: string): SectionCatalogEntry[];
}
