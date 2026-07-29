import { get } from "lodash-es";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { useLanguages } from "~/hooks/use-languages";
import { useDynamicPageSelector } from "~/pages/hooks/pages/use-dynamic-page-selector";

const SearchInput = ({
  isDefaultLang,
  searchQuery,
  setSearchQuery,
}: {
  isDefaultLang: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  return (
    <Input
      type="text"
      autoFocus
      value={isDefaultLang ? searchQuery : ""}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder={isDefaultLang ? "Search pages..." : "To search select default language"}
      disabled={!isDefaultLang}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
};

const PageSelector = ({
  dynamicPage,
  setDynamicPage,
  searchQuery,
  setSearchQuery,
  dynamicPages,
}: {
  dynamicPage: null | { id: string; name: string; slug: string; lang: string; primaryPage?: string };
  setDynamicPage: (page: null | { id: string; name: string; slug: string; lang: string; primaryPage?: string }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dynamicPages: any[];
}) => {
  const { selectedLang, fallbackLang } = useLanguages();
  const isDefaultLang = selectedLang?.length === 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-max w-max rounded-md border border-[0px] border-gray-200 py-1 pl-4 text-sm hover:bg-gray-100 focus:outline-none focus:ring-0">
          {dynamicPage ? get(dynamicPage, "name") : "Select Page"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[75vh] w-96 divide-y p-0 shadow-xl">
        <div className="bg-gray-50/30 p-1.5">
          <SearchInput isDefaultLang={isDefaultLang} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        {dynamicPages?.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-xs">No pages found</div>
        ) : (
          dynamicPages?.map((page: any) => (
            <DropdownMenuItem
              key={page.id}
              onClick={() => setDynamicPage(page)}
              disabled={isDefaultLang ? fallbackLang !== page.lang : selectedLang !== page.lang}
              className={`no-scrollbar flex cursor-pointer flex-col justify-start overflow-x-auto whitespace-nowrap ${page.id === dynamicPage?.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <div className="w-full whitespace-nowrap px-2 py-[2px] text-xs">
                <div className="flex items-center gap-x-2">
                  <span className="font-medium">{page.name}</span>
                  <span className="truncate rounded-full border border-gray-300 px-2 py-[1px] font-mono text-xs font-medium text-gray-500">
                    {page.slug}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DynamicPageSelector = () => {
  const {
    dynamicPage,
    dynamicPages,
    allLangPages,
    selectedLang,
    searchQuery,
    updateDynamicPage,
    updateSearchQuery,
    onChangeLanguage,
  } = useDynamicPageSelector();
  const selectedLangRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (selectedLangRef.current !== selectedLang && dynamicPage) {
      onChangeLanguage();
      selectedLangRef.current = selectedLang;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, dynamicPages]);

  return (
    <div className="relative">
      <PageSelector
        dynamicPage={dynamicPage}
        setDynamicPage={updateDynamicPage}
        searchQuery={searchQuery}
        setSearchQuery={updateSearchQuery}
        dynamicPages={allLangPages}
      />
    </div>
  );
};

export default DynamicPageSelector;
