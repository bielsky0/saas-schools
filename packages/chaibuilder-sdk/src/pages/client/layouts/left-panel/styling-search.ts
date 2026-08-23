type TranslateFn = (key: string) => string;

type StyleItem = Record<string, any>;
type StyleSection = { heading: string; items: StyleItem[] };

const collectLabelKeys = (item: StyleItem): string[] => {
  const keys: string[] = [];
  if (item?.label) keys.push(item.label);
  if (item?.heading) keys.push(item.heading);
  if (item?.styleType === "multiple" && Array.isArray(item?.options)) {
    for (const option of item.options) if (option?.label) keys.push(option.label);
  }
  if (item?.styleType === "accordion" && Array.isArray(item?.items)) {
    for (const child of item.items) keys.push(...collectLabelKeys(child));
  }
  return keys;
};

export const itemMatches = (item: StyleItem, query: string, t: TranslateFn): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return collectLabelKeys(item).some((key) => t(key).toLowerCase().includes(q));
};

/**
 * Filters styling sections/items by a translated label query. When the section
 * heading matches, every item is kept; otherwise only matching items survive.
 * Returns the original array (same reference) for an empty query.
 */
export const filterStylingSections = (
  sections: StyleSection[],
  query: string,
  t: TranslateFn,
): StyleSection[] => {
  const q = query.trim().toLowerCase();
  if (!q) return sections;

  return sections
    .map((section) => {
      if (t(section.heading).toLowerCase().includes(q)) return section;
      const items = section.items.filter((item) => itemMatches(item, q, t));
      return items.length > 0 ? { ...section, items } : null;
    })
    .filter((section): section is StyleSection => section !== null);
};