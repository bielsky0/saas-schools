import { find } from "lodash-es";
import { useMemo } from "react";
import { useLanguages } from "~/hooks/use-languages";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";

export const useCurrentLanguagePage = () => {
  const { selectedLang } = useLanguages();
  const { data: languagePages, isFetching } = useLanguagePages();

  const data = useMemo(() => {
    const page: any = find(languagePages, { lang: selectedLang || "" });
    return page || {};
  }, [languagePages, selectedLang]);

  return { data, isFetching };
};
