import { Cross1Icon } from "@radix-ui/react-icons";
import { useDebouncedCallback } from "@react-hookz/web";
import { FieldProps } from "@rjsf/utils";
import { get, isEmpty, map, split, startsWith } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "~/core/constants/LANGUAGES";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useLanguages } from "~/hooks/use-languages";
import { DataBindingSelector } from "./data-binding-selector";

const PageTypeField = ({ href, onChange }: { href: string; onChange: (href: string) => void }) => {
  const { t } = useTranslation();
  const searchPageTypeItems = useBuilderProp("searchPageTypeItems", (_: string, __: any) => []);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageTypeItems, setPageTypeItems] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setSearchQuery("");
    setPageTypeItems([]);
    setSelectedIndex(-1);
    setIsSearching(false);

    if (!href || loading || !startsWith(href, "pageType:")) return;
    const initHref = split(href, ":");

    (async () => {
      const initalValue = await searchPageTypeItems("", [get(initHref, 2, "page")]);
      if (initalValue && Array.isArray(initalValue)) {
        setSearchQuery(get(initalValue, [0, "name"], ""));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const getPageTypeItems = useDebouncedCallback(
    async (query: string) => {
      if (isEmpty(query)) {
        setPageTypeItems([]);
      } else {
        const pageTypeItemResponse = await searchPageTypeItems("", query);
        setPageTypeItems(pageTypeItemResponse);
      }
      setLoading(false);
      setSelectedIndex(-1);
    },
    [],
    300,
  );

  const handleSelect = (pageTypeItem: any) => {
    const href = ["pageType", pageTypeItem.pageType || "page", pageTypeItem.primaryPage ?? pageTypeItem.id];
    if (!href[1]) return;
    onChange(href.join(":"));
    setSearchQuery(pageTypeItem.name);
    setIsSearching(false);
    setPageTypeItems([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < pageTypeItems.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (pageTypeItems.length === 0) return;

        if (selectedIndex >= 0) {
          handleSelect(pageTypeItems[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        clearSearch();
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const clearSearch = () => {
    setSearchQuery("");
    setPageTypeItems([]);
    setSelectedIndex(-1);
    setIsSearching(false);
    onChange("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(!isEmpty(query));
    setLoading(true);
    getPageTypeItems(query);
  };

  return (
    <div>
      <div className="group relative flex items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("Search pages")}
          className="w-full rounded-md border border-gray-300 p-2 pr-16"
        />
        <div className="absolute bottom-2 right-2 top-3 flex items-center gap-1.5">
          {searchQuery && (
            <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600" title={t("Clear search")}>
              <Cross1Icon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {(loading || !isEmpty(pageTypeItems) || (isSearching && isEmpty(pageTypeItems))) && (
        <div className="absolute z-40 mt-2 max-h-40 w-full max-w-[250px] overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {loading ? (
            <div className="space-y-1 p-2">
              <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
            </div>
          ) : isSearching && isEmpty(pageTypeItems) ? (
            <div className="flex items-center justify-center p-4 text-sm text-gray-500">
              {t("No results found for")} "{searchQuery}"
            </div>
          ) : (
            <ul ref={listRef}>
              {map(pageTypeItems?.slice(0, 20), (item, index) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`cursor-pointer p-2 text-xs ${
                    href?.includes(item.id)
                      ? "bg-blue-200"
                      : index === selectedIndex
                        ? "bg-gray-100"
                        : "hover:bg-gray-100"
                  }`}>
                  {item.name} {item.slug && <small className="font-light text-gray-500">( {item.slug} )</small>}
                  {item.lang && (
                    <small className="ml-1 rounded bg-gray-200 px-1 py-0.5 text-[10px] font-medium text-gray-600">
                      {item.lang}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const LinkField = ({ schema, formData, onChange, name }: FieldProps) => {
  const { t } = useTranslation();
  const { type = "pageType", href = "", target = "self" } = formData ?? {};
  const pageTypes = useBuilderProp("pageTypes", []);
  const { selectedLang, fallbackLang, languages } = useLanguages();
  const lang = useMemo(
    () => (isEmpty(languages) ? "" : isEmpty(selectedLang) ? fallbackLang : selectedLang),
    [languages, selectedLang, fallbackLang],
  );
  const currentLanguage = useMemo(() => get(LANGUAGES, lang, lang), [lang]);
  const linkType = type === "pageType" && isEmpty(pageTypes) ? "url" : type;

  return (
    <div>
      <span className="flex items-center justify-between gap-x-2 text-xs font-medium">
        <span>
          {schema?.title ?? "Link"}
          <span className="pl-1 text-[9px] text-zinc-400">{currentLanguage}</span>
        </span>
        <DataBindingSelector
          schema={schema}
          onChange={(value) => {
            onChange({ ...formData, href: value, ...(linkType === "pageType" ? { type: "url" } : {}) });
          }}
          id={`root.${name}.href`}
          formData={formData}
        />
      </span>
      <div className="flex flex-col gap-y-1.5">
        <select name="type" value={type} onChange={(e) => onChange({ ...formData, type: e.target.value })}>
          {map(
            [
              ...(!isEmpty(pageTypes) ? [{ const: "pageType", title: t("Goto Page") }] : []),
              { const: "url", title: t("Open URL") },
              { const: "email", title: t("Compose Email") },
              { const: "telephone", title: t("Call Phone") },
              { const: "scroll", title: t("Scroll to element") },
            ],
            (opt) => (
              <option key={opt.const} value={opt.const}>
                {opt.title}
              </option>
            ),
          )}
        </select>
        {linkType === "pageType" && !isEmpty(pageTypes) ? (
          <PageTypeField href={href} onChange={(href: string) => onChange({ ...formData, href })} />
        ) : null}
        <input
          id={`root.${name}.href`}
          autoCapitalize={"off"}
          autoCorrect={"off"}
          spellCheck={"false"}
          name="href"
          type="text"
          className={linkType === "pageType" ? "!hidden" : ""}
          value={href}
          onChange={(e) => onChange({ ...formData, href: e.target.value })}
          placeholder={t(type === "url" ? "Enter URL" : type === "scroll" ? "#ElementID" : "Enter details")}
        />
        {linkType === "url" && (
          <div className="flex items-center gap-x-2 text-muted-foreground">
            <input
              id={`root.${name}.target`}
              autoCapitalize={"off"}
              autoCorrect={"off"}
              spellCheck={"false"}
              type="checkbox"
              checked={target === "_blank"}
              className="!w-fit cursor-pointer rounded-md border border-border"
              onChange={() => onChange({ ...formData, target: target === "_blank" ? "_self" : "_blank" })}
            />
            <span className="pt-1 text-xs">{t("Open in new tab")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export { LinkField };
