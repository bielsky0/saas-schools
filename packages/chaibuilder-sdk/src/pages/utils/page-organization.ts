import { compact, filter, includes, isEmpty, keyBy, mapValues, startCase, toLower, uniqBy } from "lodash-es";

// Define the ChaiPage interface
export interface ChaiPage {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  parent: string | null;
  children?: ChaiPage[];
  isTemplate?: boolean;
  dynamic?: boolean;
  [key: string]: any;
}

export interface PageNode extends ChaiPage {
  children: PageNode[];
  pageType: string;
  name: string;
  parent: string | null;
  slug: string;
}

export const filterPagesBySearch = (pages: ChaiPage[], search: string): ChaiPage[] => {
  if (!pages || !Array.isArray(pages)) return [];
  if (isEmpty(search)) return pages;
  return compact(
    filter(pages, (page) => {
      const searchTerm = toLower(search);
      return includes(toLower(page?.name || ""), searchTerm) || includes(toLower(page?.slug || ""), searchTerm);
    }),
  );
};
// Returns all parent pages for the given matching children, traversing recursively.
export const findParentPages = (pages: ChaiPage[], matchingPages: ChaiPage[]): ChaiPage[] => {
  const parentIds = new Set<string>();
  const allPages = keyBy(pages, "id");

  // Find all parent IDs of matching pages
  matchingPages.forEach((page) => {
    let currentPage = page;
    while (currentPage.parent && allPages[currentPage.parent]) {
      parentIds.add(currentPage.parent);
      currentPage = allPages[currentPage.parent];
    }
  });

  // Return all parent pages
  return Array.from(parentIds).map((id) => allPages[id]);
};
// Recursively marks pages that should be expanded during search
export const markPagesForExpansion = (
  pages: PageNode[],
  search: string,
  hasSlug: (pageType: string) => boolean,
): PageNode[] => {
  if (isEmpty(search)) return pages;
  return pages.map((page) => {
    // If this is a wrapper (category) for pages without a slug
    if (!hasSlug(page.pageType)) {
      return {
        ...page,
        shouldExpandOnSearch: true,
        children: page.children ? markPagesForExpansion(page.children, search, hasSlug) : [],
      };
    }
    const hasMatchingChildren =
      page.children &&
      page.children.some(
        (child) =>
          includes(toLower(child.name || ""), toLower(search)) || includes(toLower(child.slug || ""), toLower(search)),
      );
    return {
      ...page,
      shouldExpandOnSearch: hasMatchingChildren,
      children: page.children ? markPagesForExpansion(page.children, search, hasSlug) : [],
    };
  });
};

export const buildPageTree = (pages: ChaiPage[]): PageNode[] => {
  if (!pages || !pages.length) return [];

  // Create a map of pages by their id for easy lookup
  const pageMap: Record<string, PageNode> = {};
  pages.forEach((page) => {
    pageMap[page.id] = { ...page, children: [] };
  });
  const rootPages: PageNode[] = [];

  // First pass: Assign children to their parents
  Object.values(pageMap).forEach((page) => {
    if (page.parent && pageMap[page.parent]) {
      pageMap[page.parent].children.push(page);
    } else {
      rootPages.push(page);
    }
  });

  return rootPages;
};

export const sortPageTree = (pages: PageNode[]): PageNode[] => {
  if (!pages || !pages.length) return [];

  const sortedPages = [...pages].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return sortedPages.map((page) => ({
    ...page,
    children: page.children ? sortPageTree(page.children) : [],
  }));
};

export const organizePages = (
  allPages: ChaiPage[],
  search: string,
  selectedPageType: string,
  hasSlug: (pageType: string) => boolean,
): ChaiPage[] => {
  if (!allPages || !allPages.length) return [];

  // If a specific page type is selected, filter by page type first
  let filteredPages = allPages;
  if (selectedPageType !== "all") {
    filteredPages = compact(filter(allPages, { pageType: selectedPageType }));
  }

  // If searching, include parent pages of matching children
  if (!isEmpty(search)) {
    const matchingPages = filterPagesBySearch(filteredPages, search);
    const parentPages = findParentPages(allPages, matchingPages);

    // Combine matching pages with their parent pages, removing duplicates
    filteredPages = uniqBy([...matchingPages, ...parentPages], "id");
  } else {
    // If not searching, use the original filtered pages
    filteredPages = filterPagesBySearch(filteredPages, search);
  }

  // Build and sort the page tree
  const pageTree = sortPageTree(buildPageTree(filteredPages));

  // Mark pages for expansion during search
  const markedPageTree = markPagesForExpansion(pageTree, search, hasSlug);

  // Separate pages with and without slugs
  const pagesWithSlug = filter(markedPageTree, (page) => hasSlug(page.pageType)).sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
  // Group partial blocks by pageType and collect them in an array
  const partialPages = filter(markedPageTree, (page) => !hasSlug(page.pageType));

  let partialBlocks: PageNode[] = [];

  if (selectedPageType === "all") {
    // Group partial blocks by pageType when showing all page types
    const partialBlocksByType = keyBy(partialPages, "pageType");

    partialBlocks = Object.values(
      mapValues(partialBlocksByType, (page, pageType) => ({
        ...page,
        id: pageType,
        name: startCase(pageType),
        isPartialGroup: true,
        children: markedPageTree.filter((p) => p.pageType === pageType),
      })),
    );
  } else {
    // Don't group when a specific page type is selected - return individual partials
    partialBlocks = partialPages.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  return [...pagesWithSlug, ...partialBlocks];
};
