import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { filter } from "lodash-es";
import { useMemo } from "react";

export const useTemplates = (pageType?: string) => {
  const { data: pages, isFetching } = useWebsitePrimaryPages();

  const templates = useMemo(() => {
    if (!pages) return [];

    // Filter pages that are marked as templates
    const allTemplates = filter(pages, (page) => Boolean(page.isTemplate));

    // If pageType is specified, filter templates by pageType
    if (pageType) {
      return filter(allTemplates, { pageType });
    }

    return allTemplates;
  }, [pages, pageType]);

  return {
    data: templates,
    isFetching,
  };
};
