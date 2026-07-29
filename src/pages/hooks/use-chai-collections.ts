import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import type { ChaiBlock } from "~/types/common";
import { useCurrentActivePage, usePrimaryPage } from "./pages/use-current-page";
import { useApiUrl } from "./project/use-builder-prop";
import { useWebsiteSetting } from "./project/use-website-settings";
import { useFetch } from "./utils/use-fetch";

export const useChaiCollections = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useQuery({
    queryKey: [ACTIONS.GET_COLLECTIONS],
    staleTime: Infinity,
    queryFn: async () => {
      return fetchAPI(apiUrl, { action: ACTIONS.GET_COLLECTIONS });
    },
  });
};

export const useGetBlockAysncProps = () => {
  const { data: currentPage } = usePrimaryPage();
  const { data: activePage } = useCurrentActivePage();
  const { data: websiteConfig } = useWebsiteSetting();
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const fallbackLang = useMemo(() => websiteConfig?.fallbackLang || "en", [websiteConfig?.fallbackLang]);

  // Map to track in-progress requests by block ID + language
  const inProgressRequests = useRef(new Map<string, Promise<any>>());

  return useMutation({
    mutationFn: async ({ block }: { block: ChaiBlock }) => {
      const blockId = block._id;
      const lang = activePage?.lang || fallbackLang;
      const cacheKey = `${blockId}:${lang}`;

      // Check if there's already a request in progress for this block + lang combination
      if (inProgressRequests.current.has(cacheKey)) {
        return inProgressRequests.current.get(cacheKey);
      }

      // Create new request
      const requestPromise = fetchAPI(apiUrl, {
        action: ACTIONS.GET_BLOCK_ASYNC_PROPS,
        data: {
          block,
          lang,
          pageProps: {
            slug: activePage?.slug,
            searchParams: {},
            pageType: activePage?.pageType,
            fallbackLang,
            lastSaved: activePage.lastSaved,
            pageId: currentPage.id,
            primaryPageId: activePage.primaryPage || currentPage.id,
            pageBaseSlug: activePage?.slug,
            dynamic: currentPage?.dynamic,
            languagePageId: activePage.id,
          },
        },
      });

      // Store the promise in the map
      inProgressRequests.current.set(cacheKey, requestPromise);

      // Clean up the request from the map when it completes (success or error)
      requestPromise.finally(() => {
        inProgressRequests.current.delete(cacheKey);
      });

      return requestPromise;
    },
  });
};
