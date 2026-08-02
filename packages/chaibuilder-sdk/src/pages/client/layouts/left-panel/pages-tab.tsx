import { File } from "lucide-react";
import { filter, isEmpty, map } from "lodash-es";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRightPanel } from "~/hooks/use-theme";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import PageManagerSearchAndFilter from "~/pages/client/components/page-manager/page-manager-search-and-filter";
import RenderPageItems from "~/pages/client/components/page-manager/render-page-items";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { navigateToPage } from "~/pages/utils/navigation";
import { buildPageTree, filterPagesBySearch } from "~/pages/utils/page-organization";
import CollectionTreeGroup from "./collection-tree-group";
import { groupPages } from "./page-groups";

const AddNewPage = lazy(() => import("~/pages/client/components/add-new-page"));
const DeletePage = lazy(() => import("~/pages/client/components/delete-page"));
const DuplicatePage = lazy(() => import("~/pages/client/components/duplicate-page"));
const MarkAsTemplate = lazy(() => import("~/pages/client/components/mark-as-template"));
const UnmarkAsTemplate = lazy(() => import("~/pages/client/components/unmark-as-template"));
const UnpublishPage = lazy(() => import("~/pages/client/components/unpublish-page"));

const GroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div className="mb-1 mt-3 flex items-center justify-between px-1 first:mt-0">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{count}</span>
  </div>
);

export const PagesTab = () => {
  const { t } = useTranslation();
  const { data, isFetching } = useWebsitePrimaryPages();
  const { data: pageTypes } = usePageTypes();
  const { data: collectionsData } = useCollections();
  const fallbackLang = useFallbackLang();
  const [queryParams, setQueryParams] = useSearchParams();
  const [, setRightPanel] = useRightPanel();
  const [, setIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const currentPage = queryParams.get("page");

  const [search, setSearch] = useState("");
  const [selectedPageType, setSelectedPageType] = useState("all");
  const [deletePage, setDeletePage] = useState<any>(null);
  const [addEditPage, setAddEditPage] = useState<any>(null);
  const [unpublishPage, setUnpublishPage] = useState<any>(null);
  const [markAsTemplate, setMarkAsTemplate] = useState<any>(null);
  const [unmarkAsTemplate, setUnmarkAsTemplate] = useState<any>(null);
  const [duplicatePage, setDuplicatePage] = useState<any>(null);

  const pages = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (selectedPageType !== "all") {
      filtered = filter(filtered, { pageType: selectedPageType });
    }
    if (search.trim()) {
      filtered = filterPagesBySearch(filtered, search);
    }
    return filtered;
  }, [data, search, selectedPageType]);

  const collectionPageTypes = useMemo(() => {
    const set = new Set<string>();
    for (const collection of collectionsData || []) {
      set.add(collection.pageType);
      set.add(collection.templatePageType);
    }
    return set;
  }, [collectionsData]);

  const groups = useMemo(
    () =>
      groupPages(pages, pageTypes || [], collectionPageTypes).map((group) => ({
        ...group,
        tree: buildPageTree(group.pages),
      })),
    [pages, pageTypes, collectionPageTypes],
  );

  const changePage = useCallback(
    (pageId: string) => {
      setIds([]);
      setStyleBlocks([]);
      navigateToPage(new URLSearchParams({ page: pageId }), setQueryParams);
      setRightPanel("page");
    },
    [setIds, setStyleBlocks, setQueryParams, setRightPanel],
  );

  const handleClickAction = useCallback(
    (action: string, arg: any) => {
      if (!arg) return;
      switch (action) {
        case "add":
          setAddEditPage(arg);
          break;
        case "select":
          changePage(arg);
          break;
        case "edit":
          setAddEditPage(arg);
          break;
        case "delete":
          setDeletePage(arg);
          break;
        case "unpublish":
          setUnpublishPage(arg);
          break;
        case "markAsTemplate":
          setMarkAsTemplate(arg);
          break;
        case "unmarkAsTemplate":
          setUnmarkAsTemplate(arg);
          break;
        case "duplicate":
          setDuplicatePage(arg);
          break;
      }
    },
    [changePage],
  );

  // Faza 3: otwiera modal "Lista wpisów" dla danej kolekcji.
  const handleOpenPosts = useCallback((collectionId: string) => {
    console.warn(`[F3] Open posts modal for collection: ${collectionId}`);
  }, []);

  // Faza 4: przełącza w tryb edycji layoutu szablonu.
  const handleOpenTemplate = useCallback((templateId: string, collectionId: string) => {
    console.warn(`[F4] Open template editor for: ${templateId} in collection: ${collectionId}`);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <PageManagerSearchAndFilter
          pages={pages}
          search={search}
          setSearch={setSearch}
          languages={[fallbackLang]}
          selectedLanguage={fallbackLang}
          setSelectedLanguage={() => {}}
          selectedPageType={selectedPageType}
          setSelectedPageType={setSelectedPageType}
          onAddPage={(arg) => handleClickAction("add", arg)}
          showUntranslatedPages={false}
          setShowUntranslatedPages={() => {}}
        />
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {isFetching ? (
          <div className="space-y-2">
            {map([...Array(10).keys()], (key) => (
              <div key={key} className="h-7 w-full animate-pulse rounded border border-gray-200 bg-gray-100" />
            ))}
          </div>
        ) : isEmpty(pages) ? (
          <div className="flex h-[70vh] flex-col items-center justify-center gap-y-1 text-sm font-medium text-slate-500">
            <File className="h-6 w-6 stroke-[1]" />
            {t("Empty List!")}
            <span className="font-light">{t("Add new page to start")}</span>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.id}>
                <GroupHeader label={t(group.labelKey)} count={group.pages.length} />
                <RenderPageItems
                  tier={0}
                  pages={group.tree}
                  pageTypes={pageTypes}
                  currentPage={currentPage || ""}
                  onClickAction={handleClickAction}
                  languagePages={{}}
                  selectedLanguage={fallbackLang}
                  showUntranslatedPages={false}
                />
              </div>
            ))}
            {collectionsData && !isEmpty(collectionsData) && (
              <div key="collections">
                <GroupHeader label={t("CMS Collections")} count={collectionsData.length} />
                {collectionsData.map((collection) => (
                  <CollectionTreeGroup
                    key={collection.id}
                    collection={collection}
                    onOpenPosts={handleOpenPosts}
                    onOpenTemplate={handleOpenTemplate}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {addEditPage && (
        <Suspense>
          <AddNewPage
            closePanel={() => {}}
            editPage={changePage}
            addEditPage={addEditPage}
            setAddEditPage={setAddEditPage}
          />
        </Suspense>
      )}
      {deletePage && (
        <Suspense>
          <DeletePage page={deletePage} onClose={() => setDeletePage(null)} />
        </Suspense>
      )}
      {unpublishPage && (
        <Suspense>
          <UnpublishPage page={unpublishPage} onClose={() => setUnpublishPage(null)} />
        </Suspense>
      )}
      {markAsTemplate && (
        <Suspense>
          <MarkAsTemplate page={markAsTemplate} onClose={() => setMarkAsTemplate(null)} />
        </Suspense>
      )}
      {unmarkAsTemplate && (
        <Suspense>
          <UnmarkAsTemplate page={unmarkAsTemplate} onClose={() => setUnmarkAsTemplate(null)} />
        </Suspense>
      )}
      {duplicatePage && (
        <Suspense>
          <DuplicatePage page={duplicatePage} onClose={() => setDuplicatePage(null)} closePanel={() => {}} />
        </Suspense>
      )}
    </div>
  );
};
