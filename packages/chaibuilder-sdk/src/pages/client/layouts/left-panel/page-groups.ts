import { ChaiPage } from "~/pages/utils/page-organization";
import { ChaiPageType } from "~/types/actions";

export interface PageGroup {
  id: "pages" | "templates" | "system";
  labelKey: string;
  pages: ChaiPage[];
}

export const TEMPLATE_PAGE_TYPE = "template";

export const isSystemPageType = (pageType: ChaiPageType): boolean => {
  return Boolean(pageType.isSystem);
};

export const isTemplatePage = (page: ChaiPage): boolean => {
  return page.pageType === TEMPLATE_PAGE_TYPE;
};

/**
 * Groups flat/organized pages into STRONY / SZABLONY / SYSTEMOWE buckets.
 * Templates are modeled as `pageType === "template"` (backend MARK_AS_TEMPLATE).
 * System pages only appear when a matching pageType with `isSystem` exists —
 * until the API sends one the group stays hidden.
 *
 * `collectionPageTypes` holds the page types managed by CMS collections
 * (both the collection item type and its layout template type, e.g.
 * `blog_post` / `blog_post_template`). Such pages are hidden from the tree —
 * they are managed through the CMS collections section instead.
 */
export const groupPages = (
  pages: ChaiPage[],
  pageTypes: ChaiPageType[] = [],
  collectionPageTypes: Set<string> = new Set(),
): PageGroup[] => {
  const systemKeys = new Set(pageTypes.filter(isSystemPageType).map((pageType) => pageType.key));

  const groups: PageGroup[] = [
    { id: "pages", labelKey: "Pages", pages: [] },
    { id: "templates", labelKey: "Templates", pages: [] },
    { id: "system", labelKey: "System pages", pages: [] },
  ];

  for (const page of pages) {
    if (collectionPageTypes.has(page.pageType)) {
      continue;
    }
    if (systemKeys.has(page.pageType)) {
      groups[2].pages.push(page);
    } else if (isTemplatePage(page)) {
      groups[1].pages.push(page);
    } else {
      groups[0].pages.push(page);
    }
  }

  return groups.filter((group) => group.pages.length > 0);
};
