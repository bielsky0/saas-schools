import { atom, useAtom } from "jotai";
import { find, noop, values } from "lodash-es";
import { useMemo } from "react";
import { usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { useDynamicPageSlug } from "./use-dynamic-page-selector";
import { useWebsiteLanguagePages, useWebsitePrimaryPages } from "./use-project-pages";

const pageEditInfoAtom = atom<{
  lastSaved?: string;
}>({ lastSaved: undefined });

export const usePageEditInfo = () => {
  return useAtom(pageEditInfoAtom);
};

export const usePrimaryPage = () => {
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page");
  const { data: pages, isFetching } = useWebsitePrimaryPages();
  const currentPage = useMemo(() => ({ ...(find(pages, { id: page }) || {}) }), [pages, page]);
  return { data: currentPage as any, isFetching };
};

export const useCurrentActivePage = () => {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") ?? "";
  const page = searchParams.get("page");
  const { data: languagePages, isFetching } = useWebsiteLanguagePages(lang);
  const { data: primaryPages } = useWebsitePrimaryPages();
  const currentPage = useMemo(
    () =>
      find([...values(languagePages), ...primaryPages], lang == "" ? { id: page } : { lang, primaryPage: page }) || {},
    [languagePages, primaryPages, lang, page],
  );
  return { data: currentPage as any, isFetching };
};

const pageMetaDataAtom = atom<Record<string, any>>({});
export const usePageMetaData = () => {
  return useAtom(pageMetaDataAtom);
};

/**
 *
 * @returns full url of the current page
 */
export const useGetPageFullSlug = () => {
  const { data: activePage } = useCurrentActivePage();
  const dynamicPageSlug = useDynamicPageSlug();
  const getLiveUrl = usePagesProp("getLiveUrl", noop);

  const slug = activePage?.slug;
  const fullUrl = getLiveUrl(slug || "/");

  if (dynamicPageSlug) return fullUrl + dynamicPageSlug;
  return fullUrl;
};
