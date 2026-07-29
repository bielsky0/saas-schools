import { useQueryClient } from "@tanstack/react-query";
import { filter, get, isEmpty, map } from "lodash-es";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Filter,
  FilterXIcon,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { usePageExpandManager } from "~/pages/hooks/utils/use-page-expand-manager";
import { ChaiPage } from "~/pages/utils/page-organization";
import { ChaiPageType } from "~/types/actions";

/**
 * Props for PageTypeSelector component
 */
interface PageTypeSelectorProps {
  selectedPageType: string;
  setSelectedPageType: (selectedPageType: string) => void;
}

/**
 * PageTypeSelector
 * Renders a dropdown to select the type of page, with search and grouping for pages/partials.
 * @param selectedPageType - Currently selected page type
 * @param setSelectedPageType - Setter for selected page type
 */
const PageTypeSelector = ({ selectedPageType, setSelectedPageType }: PageTypeSelectorProps) => {
  const { t } = useTranslation();
  const [pageTypeSearch, setPageTypeSearch] = useState("");
  const { data: pageTypes } = usePageTypes();
  const isSearchAndSelectEnabled = true;
  const hasCustomPageTypes = useMemo(
    () => pageTypes.some((pageType: ChaiPageType) => !["page", "global"].includes(get(pageType, "key", ""))),
    [pageTypes],
  );

  useEffect(() => {
    if (!hasCustomPageTypes && selectedPageType !== "all") {
      setSelectedPageType("all");
    }
  }, [hasCustomPageTypes, selectedPageType, setSelectedPageType]);

  if (!hasCustomPageTypes) return null;

  const filterPageTypes = (pageType: ChaiPageType) => {
    if (!pageTypeSearch) return true;
    const search = pageTypeSearch.toLowerCase();

    const isIn = (key: string) =>
      String(get(pageType, key, ""))
        .toLowerCase()
        .includes(search);

    return isIn("name") || isIn("key");
  };

  const selectedPage = pageTypes.find((pageType: ChaiPageType) => pageType.key === selectedPageType);

  return (
    <Select onValueChange={setSelectedPageType} value={selectedPageType}>
      <SelectTrigger
        className={`${selectedPageType === "all" ? "bg-gray-100/30 hover:bg-gray-100" : "gap-x-1 border bg-gray-100/30 hover:bg-gray-100"} h-9 w-max min-w-[150px] overflow-hidden whitespace-nowrap rounded p-0 px-2 py-1 text-xs text-gray-600 shadow-none ring-0 focus:ring-0 [&>svg]:hidden`}>
        <div className="flex w-full items-center justify-between gap-x-1.5">
          <span className="max-w-[150px] overflow-hidden truncate whitespace-nowrap font-medium leading-tight">
            {selectedPage?.name || t("All")}
          </span>
          <ListFilter
            className={`${selectedPageType !== "all" ? "fill-sky-50 text-sky-500" : ""} pointer-events-none h-4 w-4 text-muted-foreground hover:bg-blue-300`}
          />
        </div>
      </SelectTrigger>
      <SelectContent>
        {isSearchAndSelectEnabled && (
          <div className="sticky top-0 z-10 bg-white pb-2">
            <div className="relative">
              <Search strokeWidth={2} className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder={t("Search page types...")}
                className="h-8 w-full rounded border pl-8 text-xs shadow-none"
                value={pageTypeSearch}
                onChange={(e) => setPageTypeSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <SelectItem value="all">{t("All")}</SelectItem>

        {!isEmpty(filter(pageTypes, (pageType) => pageType.hasSlug && filterPageTypes(pageType))) && (
          <>
            <div className="mt-2 border-t px-2 py-1.5 pt-2 text-xs font-semibold text-gray-500">{t("Pages")}</div>
            {map(
              [...filter(pageTypes, (pageType) => pageType.hasSlug && filterPageTypes(pageType))].sort((a, b) =>
                get(a, "name", "").localeCompare(get(b, "name", "")),
              ),
              (pageType) => (
                <SelectItem key={get(pageType, "key")} value={get(pageType, "key")}>
                  {get(pageType, "name")}
                </SelectItem>
              ),
            )}
          </>
        )}

        {/* Partials heading and page types without hasSlug */}
        {!isEmpty(filter(pageTypes, (pageType) => !pageType.hasSlug && filterPageTypes(pageType))) && (
          <>
            <div className="mt-2 border-t px-2 py-1.5 pt-2 text-xs font-semibold text-gray-500">{t("Partials")}</div>
            {map(
              [...filter(pageTypes, (pageType) => !pageType.hasSlug && filterPageTypes(pageType))].sort((a, b) =>
                get(a, "name", "").localeCompare(get(b, "name", "")),
              ),
              (pageType) => (
                <SelectItem key={get(pageType, "key")} value={get(pageType, "key")}>
                  {get(pageType, "name")}
                </SelectItem>
              ),
            )}
          </>
        )}
        {isEmpty(filter(pageTypes, filterPageTypes)) && (
          <div className="px-3 py-2 text-center text-sm text-gray-500">{t("No matching page types found")}</div>
        )}
      </SelectContent>
    </Select>
  );
};

/**
 * Props for SearchInput component
 */
interface SearchInputProps {
  search: string;
  setSearch: (search: string) => void;
}

/**
 * SearchInput
 * Renders a search input field with an integrated page type selector.
 * @param search - Current search query
 * @param setSearch - Setter for search query
 */
const SearchInput = ({ search, setSearch }: SearchInputProps) => {
  const { t } = useTranslation();
  return (
    <div className={`relative flex h-9 flex-1 items-center gap-2 rounded-md border px-2.5`}>
      <label htmlFor="page-search-input" className="sr-only">
        {t("Search Pages")}
      </label>
      <Search
        className={`${search ? "fill-sky-50 text-sky-500" : ""} pointer-events-none h-4 w-4 text-muted-foreground`}
        aria-hidden="true"
      />
      <Input
        id="page-search-input"
        placeholder={t("Search pages")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border-none px-1.5 shadow-none outline-none ring-0 transition-none focus:outline-none focus:ring-0 focus-visible:ring-0"
        autoComplete="off"
        autoFocus
      />
    </div>
  );
};

/**
 * ExpandCollapse
 * Props for ExpandCollapse component
 * @param pages - Array of pages to be displayed
 * @returns Expand/Collapse buttons
 */
const ExpandCollapse = ({ pages }: { pages: ChaiPage[] }) => {
  const { t } = useTranslation();
  const { expandAll, collapseAll, expandedPages } = usePageExpandManager(null);
  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={() => expandAll(pages)} className="rounded p-1 text-gray-500">
            <ChevronsUpDown />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("Expand All")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={expandedPages.length === 0}
            variant="outline"
            size="icon"
            onClick={() => collapseAll()}
            className="rounded p-1 text-gray-500">
            <ChevronsDownUp />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("Collapse All")}</TooltipContent>
      </Tooltip>
    </div>
  );
};

/**
 * Props for LanguageSelector component
 */
interface LanguageSelectorProps {
  languages: string[];
  selectedLanguage: string;
  setSelectedLanguage: (selectedLanguage: string) => void;
}

/**
 * LanguageSelector
 * Renders a row of language selection buttons.
 * @param languages - Array of available languages
 * @param selectedLanguage - Currently selected language
 * @param setSelectedLanguage - Setter for selected language
 */
export const LanguageSelector = ({ languages, selectedLanguage, setSelectedLanguage }: LanguageSelectorProps) => {
  const fallbackLang = useFallbackLang();
  return (
    <div className="scrollbar-hide flex gap-1 overflow-x-auto pb-1">
      {languages.map((lang) => (
        <Button
          key={lang}
          variant={selectedLanguage === lang ? "default" : "outline"}
          size="sm"
          className={`h-6 flex-shrink-0 whitespace-nowrap rounded px-3 text-xs font-normal ${selectedLanguage === lang ? "bg-black text-white hover:bg-black" : "text-gray-500"}`}
          onClick={() => setSelectedLanguage(lang.toLowerCase())}>
          {lang === fallbackLang && (
            <Star size={4} className={`p-0.5 ${selectedLanguage === fallbackLang ? "fill-white" : "fill-black"}`} />
          )}
          {LANGUAGES[lang] || ""}
        </Button>
      ))}
    </div>
  );
};

const RefreshPagesList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_WEBSITE_PAGES] })}
          className="mt-1 h-6 w-6">
          <RefreshCw />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("Refresh pages list")}</TooltipContent>
    </Tooltip>
  );
};

/**
 * Props for PageManagerSearchAndFilter component
 */
export interface PageManagerSearchAndFilterProps {
  pages: ChaiPage[];
  search: string;
  setSearch: (search: string) => void;
  languages: string[];
  selectedLanguage: string;
  setSelectedLanguage: (selectedLanguage: string) => void;
  selectedPageType: string;
  setSelectedPageType: (selectedPageType: string) => void;
  onAddPage: (arg: any) => void;
  showUntranslatedPages: boolean;
  setShowUntranslatedPages: (showUntranslatedPages: boolean) => void;
}

/**
 * PageManagerSearchAndFilter
 * Main filter/search component for the Page Manager, providing search, language, and page type controls.
 * @param pages - Array of pages to be displayed
 * @param search - Current search query
 * @param setSearch - Setter for search query
 * @param languages - Array of available languages
 * @param onAddPage - Callback function to handle add page action
 * @param selectedLanguage - Currently selected language
 * @param setSelectedLanguage - Setter for selected language
 * @param selectedPageType - Currently selected page type
 * @param setSelectedPageType - Setter for selected page type
 */
const PageManagerSearchAndFilter = ({
  pages,
  search,
  setSearch,
  languages,
  onAddPage,
  selectedLanguage,
  setSelectedLanguage,
  selectedPageType,
  setSelectedPageType,
  showUntranslatedPages,
  setShowUntranslatedPages,
}: PageManagerSearchAndFilterProps) => {
  const { t } = useTranslation();
  const isMultiLingual = false;
  return (
    <div className="space-y-3 border-b border-b-gray-200 px-4 pb-1">
      <div className="flex items-center gap-x-2">
        <PageTypeSelector selectedPageType={selectedPageType} setSelectedPageType={setSelectedPageType} />
        <SearchInput search={search} setSearch={setSearch} />
        <ExpandCollapse pages={pages} />
        <Button variant="default" onClick={onAddPage} className="rounded px-3 font-normal">
          <Plus strokeWidth={2} className="stroke-white stroke-[3]" />
          <span className="font-normal text-white">{t("Add Page")}</span>
        </Button>
        {!isMultiLingual && <RefreshPagesList />}
      </div>
      {isMultiLingual ? (
        <div className="flex items-center justify-between gap-2">
          <LanguageSelector
            languages={languages}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={(_selection) => {
              setSelectedLanguage(_selection);
              setShowUntranslatedPages(showUntranslatedPages && languages?.[0] !== selectedLanguage);
            }}
          />
          <div className="flex items-center gap-x-2">
            {languages?.[0] !== selectedLanguage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setShowUntranslatedPages(!showUntranslatedPages)}
                    className="h-6 rounded px-3 py-1 text-xs font-normal">
                    {showUntranslatedPages ? <FilterXIcon /> : <Filter />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("Toggle Untranslated Pages")}</TooltipContent>
              </Tooltip>
            )}
            <RefreshPagesList />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2" />
      )}
    </div>
  );
};

export default PageManagerSearchAndFilter;
