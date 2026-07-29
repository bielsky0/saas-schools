import { useAtomValue, useSetAtom } from "jotai";
import { compact, find, get, isEmpty, map } from "lodash-es";
import { ChevronDown, Languages, Plus, Star } from "lucide-react";
import React, { lazy, Suspense, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { mergeClasses } from "~/core/main";
import { useLanguages } from "~/hooks/use-languages";
import { addNewLangAtom } from "~/pages/atom/add-new-lang";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { useWebsiteSetting } from "~/pages/hooks/project/use-website-settings";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { navigateToPage } from "~/pages/utils/navigation";
import { usePageLockStatus } from "./page-lock/page-lock-hook";

const AddNewLanguagePage = lazy(() => import("./add-new-language-page"));

const TopLeftCorner = () => {
  const topLeftCorner = usePagesProp("topLeftCorner", null);
  if (!topLeftCorner) return null;
  return <div className="max-h-9 w-full overflow-hidden pr-2">{React.createElement(topLeftCorner, {})}</div>;
};

export const LanguageSwitcher = ({
  showAdd = true,
  goToDefaultLang = false,
}: {
  showAdd?: boolean;
  goToDefaultLang?: boolean;
}) => {
  const { fallbackLang, languages, selectedLang, setSelectedLang } = useLanguages();
  const currentLang = !isEmpty(selectedLang) ? selectedLang : fallbackLang;
  const [, setSearchParams] = useSearchParams();
  const { isLocked } = usePageLockStatus();
  const { t } = useTranslation();

  // Read and validate lang parameter on mount
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const langParam = currentParams.get("lang");
    if (langParam) {
      // Check if langParam is one of the valid languages
      const isValidLang = languages.includes(langParam);
      if (isValidLang) {
        setSelectedLang(langParam);
      } else {
        // Invalid lang param - remove it and reset lang
        currentParams.delete("lang");
        setSearchParams(currentParams);
        setSelectedLang("");
      }
    }
  }, [languages, setSearchParams, setSelectedLang]);

  const setAddNewLang = useSetAtom(addNewLangAtom);

  const { data: currentPage } = usePrimaryPage();
  const { data: websiteSettings } = useWebsiteSetting();
  const { data: languagePages } = useLanguagePages();

  const languageOptions = useMemo(() => {
    const allAvailableLanguages = compact(
      map(get(websiteSettings, "languages"), (lang) => {
        const langPage = find(languagePages, { lang });
        return {
          key: lang,
          value: get(LANGUAGES, lang, lang),
          isLangPageAdded: Boolean(langPage),
        };
      }),
    ).filter(Boolean);
    return [
      {
        key: fallbackLang,
        value: get(LANGUAGES, fallbackLang),
        isLangPageAdded: true,
      },
      ...allAvailableLanguages,
    ];
  }, [fallbackLang, languagePages, websiteSettings]);

  const handleLanguageChange = (lang: string) => {
    /**
     * Check for unsaved SEO changes before switching languages.
     * If SEO panel is open, dispatch event to check for dirty state.
     * This prevents data loss when users have unsaved SEO form changes.
     */
    const seoPanel = document.querySelector('[data-panel-id="seo"]');
    if (seoPanel) {
      const checkDirtyEvent = new CustomEvent("seo-language-switch-check", {
        detail: {
          fromLang: currentLang,
          toLang: lang,
          switchHandler: () => performLanguageSwitch(lang),
        },
      });
      window.dispatchEvent(checkDirtyEvent);
      return;
    }

    // No SEO panel open, proceed with immediate language switch
    performLanguageSwitch(lang);
  };

  const performLanguageSwitch = (lang: string) => {
    setSelectedLang(lang);
    const currentParams = new URLSearchParams(window.location.search);

    if (lang === fallbackLang) {
      currentParams.delete("lang");
    } else {
      currentParams.set("lang", lang);
    }

    navigateToPage(currentParams, setSearchParams);
  };

  if (isEmpty(languages)) return null;

  if (isLocked) {
    return (
      <Button variant="ghost" size="sm" className="ml-px h-max cursor-not-allowed gap-2 py-1.5 opacity-50">
        <Languages className="h-4 w-4" />
        {get(LANGUAGES, currentLang, currentLang)}
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  if (goToDefaultLang) {
    return (
      <Button onClick={() => performLanguageSwitch(fallbackLang)} variant={"link"} size="sm">
        {t("Switch to default language")}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="focus:outline-none">
          <Button disabled={Boolean(isLocked)} variant={"outline"} size="sm" className="ml-px h-max gap-2 py-1.5">
            <Languages className="h-4 w-4" />
            {get(LANGUAGES, currentLang, currentLang)}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="space-y-1 border-border">
          {map(
            languageOptions.filter((opt) => opt.isLangPageAdded),
            (option: any) => (
              <DropdownMenuItem
                key={option.value}
                className={mergeClasses(
                  "flex cursor-pointer items-center justify-between text-xs font-medium text-gray-800",
                  option.key === currentLang && "!bg-gray-200 text-gray-700",
                )}
                onClick={() => handleLanguageChange(option.key)}>
                <div className="text-slate-600">{option.value}</div>
                {option.key === fallbackLang && (
                  <small className={`flex items-center gap-x-1 text-[9px] leading-none text-orange-500`}>
                    <Star fill="orange" className="h-2 w-2" />
                    Primary
                  </small>
                )}
              </DropdownMenuItem>
            ),
          )}
          {showAdd && !isEmpty(languageOptions.filter((opt) => !opt.isLangPageAdded)) && (
            <>
              <Separator />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!currentPage) return;
                  setAddNewLang({
                    edit: false,
                    primaryPage: currentPage.id,
                  });
                }}
                className="text-xs font-normal duration-200 hover:bg-slate-300 hover:text-slate-800">
                <Plus className="mr-1 h-3 w-3" /> Add Language
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default function TopbarLeft() {
  const addNewLang = useAtomValue(addNewLangAtom);
  const setAddNewLang = useSetAtom(addNewLangAtom);

  return (
    <div className="relative z-10 flex items-center justify-end gap-1">
      <TopLeftCorner />
      {addNewLang && (
        <Suspense>
          <AddNewLanguagePage
            isOpen={true}
            id={addNewLang?.id}
            edit={Boolean(addNewLang?.id)}
            primaryPage={addNewLang?.primaryPage}
            preselectedLang={addNewLang?.preselectedLang}
            onClose={() => setAddNewLang(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
