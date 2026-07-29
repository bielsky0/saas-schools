import { useQuery } from "@tanstack/react-query";
import { atom, PrimitiveAtom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguages } from "~/hooks/use-languages";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { usePrimaryPage } from "./use-current-page";

type DynamicPage = { id: string; name: string; slug: string; lang: string; primaryPage?: string };

const selectedDynamicPage = atom<null | DynamicPage>(null) as PrimitiveAtom<null | DynamicPage>;

export const useSelectedDynamicPage = () => useAtom(selectedDynamicPage);

export const useDynamicPageSlug = () => {
  const [dynamicPage] = useSelectedDynamicPage();
  return dynamicPage?.slug || "";
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

const useGetDynamicPages = ({ query, uuid }: { query: string; uuid?: string }) => {
  const { selectedLang, fallbackLang } = useLanguages();
  const { data: currentPage } = usePrimaryPage();
  const pageType = currentPage?.pageType;
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const { data, isFetching } = useQuery({
    queryKey: [ACTIONS.GET_DYNAMIC_PAGES, query, pageType, uuid],
    staleTime: 60 * 60 * 1000,
    placeholderData: [],
    queryFn: async () => {
      const data = await fetchAPI(apiUrl, {
        action: ACTIONS.GET_DYNAMIC_PAGES,
        data: { query, pageType, uuid },
      });
      return data || [];
    },
    enabled: !!pageType,
  });

  // * Filter based on current language
  const dynamicPages = useMemo(() => {
    if (selectedLang === "") {
      return data.filter((page: any) => page.lang === "" || page.lang === fallbackLang);
    }
    return data.filter((page: any) => page.lang === selectedLang);
  }, [selectedLang, fallbackLang, data]);

  return { allLangPages: data, data: dynamicPages, isFetching };
};

export const useDynamicPageSelector = () => {
  const { selectedLang, fallbackLang } = useLanguages();
  const [dynamicPage, setDynamicPage] = useSelectedDynamicPage();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 500);

  const { allLangPages, data: dynamicPages, isFetching } = useGetDynamicPages({ query: debouncedSearchQuery });

  const updateDynamicPage = useCallback((page: any) => setDynamicPage(page), [setDynamicPage]);
  const updateSearchQuery = useCallback((query: string) => setSearchQuery(query), [setSearchQuery]);

  // * When dynamic page is selected and language is changed
  const onChangeLanguage = useCallback(() => {
    if (!dynamicPage) return;

    const isCurrentPagePrimary = !dynamicPage?.primaryPage;
    const isNewPagePrimary = selectedLang.length === 0;

    const primaryPageId = isCurrentPagePrimary ? dynamicPage?.id : dynamicPage?.primaryPage;
    const thisPageAllLang = allLangPages.filter(
      (page: { id: string; primaryPage?: string }) => page?.primaryPage === primaryPageId || page.id === primaryPageId,
    );

    const newLangPage = thisPageAllLang.find((page: { lang: string }) => {
      if (isNewPagePrimary) return page.lang === selectedLang || page.lang === fallbackLang;
      return page.lang === selectedLang;
    });

    if (newLangPage) setDynamicPage(newLangPage);
    else setDynamicPage(dynamicPage);
  }, [dynamicPage, selectedLang, allLangPages, setDynamicPage, fallbackLang]);

  return {
    isFetching,
    dynamicPage,
    searchQuery,
    selectedLang,
    dynamicPages,
    allLangPages,
    updateDynamicPage,
    updateSearchQuery,
    onChangeLanguage,
  };
};
