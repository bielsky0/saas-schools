import { each, get, isEmpty } from "lodash-es";

import { find } from "lodash-es";
import { useMemo } from "react";
import { useLanguages } from "~/hooks/use-languages";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { useWebsiteSetting } from "~/pages/hooks/project/use-website-settings";

export const useIsLanguagePageCreated = (lang: string) => {
  const { fallbackLang } = useLanguages();
  const { data: websiteSettings } = useWebsiteSetting();
  const { data: languagePages, isFetching: isFetchingLanguagePages } = useLanguagePages();

  const languageOptions = useMemo(() => {
    const langPages = { [fallbackLang]: true };
    each(get(websiteSettings, "languages"), (langCode) => {
      const langPage = find(languagePages, { lang: langCode });
      langPages[langCode] = Boolean(langPage);
    });
    return langPages;
  }, [fallbackLang, languagePages, websiteSettings]);

  return isFetchingLanguagePages || isEmpty(lang) || (lang && languageOptions[lang]);
};
