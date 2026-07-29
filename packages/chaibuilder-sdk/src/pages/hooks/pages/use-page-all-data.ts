import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useCurrentActivePage, usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { useDynamicPageSlug } from "./use-dynamic-page-selector";

/**
 * Hook to fetch all page data in a single API call
 * Consolidates GET_DRAFT_PAGE, GET_BUILDER_PAGE_DATA, and GET_LANGUAGE_PAGES
 * Uses queryClient.setQueryData to populate individual caches for backward compatibility
 */
export const usePageAllData = () => {
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page");
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const queryClient = useQueryClient();
  const { data: primaryPage } = usePrimaryPage();
  const { data: activePage } = useCurrentActivePage();
  const fallbackLang = useFallbackLang();
  const dynamicPageSlug = useDynamicPageSlug();

  return useQuery({
    queryKey: [ACTIONS.GET_PAGE_ALL_DATA, page, activePage?.id, dynamicPageSlug],
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const data: any = await fetchAPI(apiUrl, {
        action: ACTIONS.GET_PAGE_ALL_DATA,
        data: {
          id: page,
          lang: activePage?.lang || fallbackLang,
          pageType: primaryPage?.pageType,
          pageProps: {
            slug: activePage?.slug + dynamicPageSlug,
            searchParams: {},
            pageType: activePage?.pageType,
            fallbackLang,
            lastSaved: activePage?.lastSaved,
            pageId: primaryPage?.id,
            primaryPageId: activePage?.primaryPage || primaryPage?.id,
            pageBaseSlug: activePage?.slug,
            dynamic: primaryPage?.dynamic,
            languagePageId: activePage?.id,
            metadata: primaryPage?.metadata || {},
          },
        },
      });

      // Populate individual query caches for backward compatibility
      // This allows useBuilderPageData() to work without changes
      queryClient.setQueryData([ACTIONS.GET_BUILDER_PAGE_DATA, activePage?.id, dynamicPageSlug], data.builderPageData);
      queryClient.setQueryData([ACTIONS.GET_LANGUAGE_PAGES, page], data.languagePages);

      return data;
    },
    enabled: !!page && !!primaryPage?.pageType && !!activePage?.id,
  });
};
