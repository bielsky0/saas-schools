import { useQuery } from "@tanstack/react-query";
import { keyBy, map } from "lodash-es";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { ChaiPage } from "~/pages/utils/page-organization";

export const useWebsitePrimaryPages = () => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery({
    queryKey: [ACTIONS.GET_WEBSITE_PAGES],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      return fetchApi(apiUrl, { action: ACTIONS.GET_WEBSITE_PAGES }) || [];
    },
    placeholderData: (prevData) => prevData || [],
  });
};

export const useWebsiteLanguagePages = (lang: string) => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();
  const fallbackLang = useFallbackLang();
  return useQuery<Record<string, ChaiPage>>({
    queryKey: [ACTIONS.GET_WEBSITE_PAGES, lang, fallbackLang],
    staleTime: 1000 * 60 * 5,
    enabled: !!lang,
    queryFn: async () => {
      if (fallbackLang === lang) return {};
      const data = (await fetchApi(apiUrl, { action: ACTIONS.GET_WEBSITE_PAGES, data: { lang } })) || [];
      return keyBy(
        map(data, (page: ChaiPage) => ({ ...page, lang })),
        "primaryPage",
      );
    },
    placeholderData: (prevData) => prevData || {},
  });
};
