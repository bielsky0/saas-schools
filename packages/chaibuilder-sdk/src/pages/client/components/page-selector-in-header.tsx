import { ChevronDown, File, Hash, Loader, Plus, Search } from "lucide-react";
import { filter, find, get, isEmpty, startCase } from "lodash-es";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/core/functions/common-functions";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useCurrentActivePage } from "~/pages/hooks/pages/use-current-page";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useChangePage } from "~/pages/hooks/use-change-page";
import { ChaiPageType } from "~/types/actions";

const AddNewPage = lazy(() => import("./add-new-page"));

const pageTypeLabel = (pageType: ChaiPageType, fallback: string) => {
  const name = pageType?.name;
  if (typeof name === "string") return name;
  return startCase(fallback);
};

export const PageSelector = () => {
  const { t } = useTranslation();
  const { data: pages, isFetching } = useWebsitePrimaryPages();
  const { data: pageTypes } = usePageTypes();
  const { data: currentPage } = useCurrentActivePage();
  const changePage = useChangePage();
  const [, setIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { setContext: setEditorContext } = useEditorContext();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addEditPage, setAddEditPage] = useState<any>(null);

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    const query = search.trim().toLowerCase();
    return filter(pages, (page) => {
      if (query && !(page.name || "").toLowerCase().includes(query) && !(page.slug || "").toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [pages, search]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const page of filteredPages) {
      const key = page.pageType || "page";
      const label = pageTypeLabel(find(pageTypes, { key }), key);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(page);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPages, pageTypes]);

  const onPageSelect = useCallback(
    (pageId: string) => {
      setIds([]);
      setStyleBlocks([]);
      changePage(pageId);
      setEditorContext({ type: "page", pageId });
      setOpen(false);
    },
    [setIds, setStyleBlocks, changePage, setEditorContext],
  );

  const isPartial = !currentPage?.slug;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Select page")}
            className="flex h-7 min-w-0 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
            {isFetching ? (
              <Loader className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <span className="flex min-w-0 items-center gap-1">
                {isPartial ? <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <File className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                <span className="max-w-[160px] truncate">{get(currentPage, "name") ?? t("Select page")}</span>
              </span>
            )}
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-72 p-0" sideOffset={6}>
          <div className="flex items-center gap-1 border-b border-gray-200 p-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search pages")}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md"
              aria-label={t("Add new page")}
              onClick={() => {
                setOpen(false);
                setAddEditPage({});
              }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="no-scrollbar max-h-80 overflow-y-auto p-1">
            {isEmpty(groups) ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("No pages found")}</p>
            ) : (
              groups.map(([label, groupPages]) => (
                <div key={label} className="mb-1">
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  {groupPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onPageSelect(page.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100",
                        currentPage?.id === page.id && "bg-gray-100 font-medium",
                      )}>
                      {page.slug ? <File className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                      <span className="min-w-0 flex-1 truncate">{page.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {addEditPage && (
        <Suspense>
          <AddNewPage
            closePanel={() => setAddEditPage(null)}
            editPage={() => {}}
            addEditPage={addEditPage}
            setAddEditPage={setAddEditPage}
          />
        </Suspense>
      )}
    </>
  );
};

export default PageSelector;
