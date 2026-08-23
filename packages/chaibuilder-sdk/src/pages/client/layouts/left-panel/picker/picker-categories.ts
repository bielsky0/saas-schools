import type { SectionCatalogEntry, SectionCategory, SectionPickerCategoryId } from "~/types/section-catalog";

/**
 * Shopify-style picker taxonomy.
 *
 * Section Picker groups ready-made sections into editorial categories
 * (Banery, Formularze, Kolekcje, ...) while the Block Picker groups the
 * blocks that can be nested inside a section (Podstawowe, Produkt, Stopka, ...).
 *
 * Existing metadata (SectionCatalog categories for sections, block `group`
 * values for blocks) is mapped onto this taxonomy. The app can override the
 * default mapping via `registerBlockPickerCategory()` / the optional
 * `pickerCategory` field on `SectionCatalogEntry`.
 */

export type { SectionPickerCategoryId } from "~/types/section-catalog";

export type BlockPickerCategoryId =
  | "Dekoracyjne"
  | "Formularze"
  | "Kolekcja"
  | "Linki"
  | "Niestandardowe"
  | "Podstawowe"
  | "Produkt"
  | "Stopka"
  | "Układ";

export type PickerItem = {
  /** `_type` of the block. */
  type: string;
  /** Display label (i18n key or literal string). */
  label: string;
  description?: string;
  /** Section layout role (header / template / footer) — sections picker only. */
  role?: string;
};

export type PickerCategory = {
  /** Category id used as the i18n key. */
  id: string;
  items: PickerItem[];
};

export const SECTION_PICKER_CATEGORY_ORDER: SectionPickerCategoryId[] = [
  "Banery",
  "Formularze",
  "Kolekcje",
  "Narracja",
  "Produkty",
  "Tekst",
  "Układ",
];

export const BLOCK_PICKER_CATEGORY_ORDER: BlockPickerCategoryId[] = [
  "Dekoracyjne",
  "Formularze",
  "Kolekcja",
  "Linki",
  "Niestandardowe",
  "Podstawowe",
  "Produkt",
  "Stopka",
  "Układ",
];

/** Default mapping of existing SectionCatalog categories onto the picker taxonomy. */
const SECTION_CATEGORY_TO_PICKER: Record<SectionCategory, SectionPickerCategoryId> = {
  all: "Układ",
  hero: "Banery",
  media: "Narracja",
  pricing: "Produkty",
  forms: "Formularze",
  testimonials: "Narracja",
  footers: "Układ",
  cards: "Kolekcje",
};

export type SectionPickerSource = Pick<
  SectionCatalogEntry,
  "type" | "labelKey" | "category" | "pickerCategory" | "role"
>;

export const getSectionPickerCategory = (entry: SectionPickerSource): SectionPickerCategoryId =>
  entry.pickerCategory ?? SECTION_CATEGORY_TO_PICKER[entry.category] ?? "Układ";

/** Default mapping of block `group` values onto the picker taxonomy. */
const BLOCK_GROUP_TO_PICKER: Record<string, BlockPickerCategoryId> = {
  basic: "Podstawowe",
  typography: "Podstawowe",
  media: "Podstawowe",
  other: "Podstawowe",
  layout: "Układ",
  advanced: "Układ",
  form: "Formularze",
};

const blockPickerCategoryRegistry = new Map<string, BlockPickerCategoryId>();

/** Register (or override) the picker category of a specific block type. */
export const registerBlockPickerCategory = (type: string, category: BlockPickerCategoryId): void => {
  blockPickerCategoryRegistry.set(type, category);
};

export const registerBlockPickerCategories = (entries: [string, BlockPickerCategoryId][]): void => {
  entries.forEach(([type, category]) => registerBlockPickerCategory(type, category));
};

export const getBlockPickerCategory = (type: string, group?: string): BlockPickerCategoryId =>
  blockPickerCategoryRegistry.get(type) ?? BLOCK_GROUP_TO_PICKER[group ?? ""] ?? "Podstawowe";

/**
 * Build the Section Picker category tree from SectionCatalog entries.
 * Returns categories in display order, skipping empty ones.
 */
export const createSectionPickerCategories = (entries: SectionPickerSource[]): PickerCategory[] => {
  const byCategory = new Map<SectionPickerCategoryId, PickerItem[]>();
  for (const entry of entries) {
    const category = getSectionPickerCategory(entry);
    const items = byCategory.get(category) ?? [];
    items.push({ type: entry.type, label: entry.labelKey, role: entry.role });
    byCategory.set(category, items);
  }
  return SECTION_PICKER_CATEGORY_ORDER.map((id) => ({ id, items: byCategory.get(id) ?? [] })).filter(
    (category) => category.items.length > 0,
  );
};

export type BlockCatalogSource = {
  type: string;
  label: string;
  group?: string;
  hidden?: boolean | ((parentType?: string) => boolean);
};

/**
 * Build the Block Picker category tree from registered blocks, grouped by
 * picker category. `canAddBlock` lets the caller filter out blocks that the
 * target section cannot accept (defaults to allowing everything).
 */
export const createBlockCatalog = (
  blocks: BlockCatalogSource[],
  parentType?: string,
  canAddBlock?: (type: string) => boolean,
): PickerCategory[] => {
  const byCategory = new Map<BlockPickerCategoryId, PickerItem[]>();
  for (const block of blocks) {
    if (block.hidden === true) continue;
    if (typeof block.hidden === "function" && block.hidden(parentType)) continue;
    if (parentType && canAddBlock && !canAddBlock(block.type)) continue;

    const category = getBlockPickerCategory(block.type, block.group);
    const items = byCategory.get(category) ?? [];
    items.push({ type: block.type, label: block.label });
    byCategory.set(category, items);
  }
  return BLOCK_PICKER_CATEGORY_ORDER.map((id) => ({ id, items: byCategory.get(id) ?? [] })).filter(
    (category) => category.items.length > 0,
  );
};

/**
 * Case-insensitive search over a category tree. Categories keep their order
 * and only keep items matching the query; empty categories are dropped.
 */
export const filterPickerCategories = (categories: PickerCategory[], query: string): PickerCategory[] => {
  const q = query.trim().toLowerCase();
  if (!q) return categories;
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => `${item.label} ${item.type}`.toLowerCase().includes(q)),
    }))
    .filter((category) => category.items.length > 0);
};