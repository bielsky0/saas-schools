"use client";

import { concat, filter, find, first, get, includes, isEmpty, keys, map, orderBy, uniq } from "lodash-es";
import { Edit, File, GlobeIcon, Lock } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { usePageToUser } from "~/pages/client/components/page-lock/page-lock-hook";
import { useUserId } from "~/pages/client/components/page-lock/page-lock-utils";
import { LanguageSelector } from "~/pages/client/components/page-manager/page-manager-search-and-filter";
import { useGetPageChanges } from "~/pages/hooks/pages/use-get-page-changes";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useChaiUserInfo } from "~/pages/hooks/utils/use-chai-user-info";
import { throwConfetti } from "~/pages/utils/confetti";
import Tooltip from "~/pages/utils/tooltip";

const SinglePageItem = ({ page, selectedPages, handleCheckboxChange, getPageType, hasSlug, currentOwnerId }: any) => {
  const userId = useUserId();
  const { data: pageOwnerData } = useChaiUserInfo(currentOwnerId);
  const currentOwner = currentOwnerId === userId ? null : pageOwnerData?.name;

  return (
    <tr key={page?.id} className="group relative border-b last:border-b-0 hover:bg-gray-50">
      <td
        scope="row"
        className={`flex items-center gap-x-1 whitespace-nowrap px-6 py-2 text-gray-900 dark:text-white ${currentOwner ? "opacity-50" : ""}`}>
        {currentOwner ? (
          <Lock className="h-4 w-4 fill-red-200 text-red-500" />
        ) : (
          <input
            checked={includes(selectedPages, page?.id)}
            onClick={(e) => {
              e.stopPropagation();
              handleCheckboxChange(page?.id);
            }}
            type="checkbox"
            className="cursor-pointer rounded focus:outline-none focus:ring-0"
          />
        )}
        &nbsp;
        {!hasSlug(page.pageType) ? <GlobeIcon className="h-4 w-4" /> : <File className="h-4 w-4" />}
        <Tooltip content={page.name} side="top" showTooltip={page.name.length > 25}>
          <span className="max-w-[200px] truncate font-medium text-black">{page.name}</span>
        </Tooltip>
        {page.slug && (
          <Tooltip content={page.slug} side="top" showTooltip={page.slug.length > 25}>
            <span className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">{page.slug}</span>
          </Tooltip>
        )}
      </td>

      <td className="px-2">{getPageType(page?.pageType)}</td>
      <td className="px-4 text-right">{first(page.changes) || ""}</td>

      <>
        {currentOwner && (
          <button className="absolute right-0 top-0 flex h-full items-center gap-x-1 rounded bg-red-50 px-2 py-0.5 text-xs font-light text-red-500 opacity-0 group-hover:opacity-100">
            <Edit size={12} className="stroke-[3]" /> <span className="font-medium">{currentOwner}</span> is editing
            this page
          </button>
        )}
      </>
    </tr>
  );
};

const PublishPagesModalContent = ({
  onClose = () => {},
  isPending,
  publishPage,
}: {
  onClose: () => void;
  isPending: boolean;
  publishPage: (arg1: any, arg2?: any) => void;
}) => {
  const userId = useUserId();
  const { pageToUser } = usePageToUser();
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const fallbackLang = useFallbackLang();
  const [selectedLanguage, setSelectedLanguage] = useState(fallbackLang);

  const { data: pages, isFetching } = useGetPageChanges();
  const { data: pageTypes } = usePageTypes();
  const hasSlug = useCallback((pageType: string) => find(pageTypes, { key: pageType })?.hasSlug, [pageTypes]);
  const nonSlugPageTypes = useMemo(
    () => filter(pageTypes, (pageType) => !hasSlug(pageType.key)).map((pageType) => pageType.key),
    [hasSlug, pageTypes],
  );

  const usedLanguages = () => {
    return uniq(map(pages, "lang")).filter(Boolean);
  };
  const languages = usedLanguages();
  const filteredPages = useMemo(
    () =>
      filter(pages, (page) => {
        if (page.pageType === "theme" || page.pageType === "design_tokens") return false;
        if (selectedLanguage === fallbackLang) return page.lang === selectedLanguage || page.lang === "";
        return page.lang === selectedLanguage;
      }),
    [pages, selectedLanguage, fallbackLang],
  );

  const allPages = useMemo(
    () => filter(filteredPages, (page) => !nonSlugPageTypes.includes(page.pageType)),
    [filteredPages, nonSlugPageTypes],
  );

  const allGlobalBlocks = useMemo(
    () => filter(filteredPages, (page) => nonSlugPageTypes.includes(page.pageType)),
    [filteredPages, nonSlugPageTypes],
  );

  useEffect(() => {
    const preSelected = map(filter(filteredPages, { online: true }), "id");
    startTransition(() => setSelectedPages(preSelected));
  }, [filteredPages]);

  useEffect(() => {
    const pageOwnedByOtherUsers = filter(keys(pageToUser), (pageId) => get(pageToUser, [pageId, "userId"]) !== userId);
    startTransition(() => setSelectedPages((prev) => filter(prev, (id) => !includes(pageOwnedByOtherUsers, id))));
  }, [pageToUser, userId]);

  const isAllSelected = selectedPages.length === filteredPages?.length;

  const handleCheckboxChange = (pageId: string) => {
    setSelectedPages((prev) => (includes(prev, pageId) ? filter(prev, (id) => id !== pageId) : concat(prev, pageId)));
  };

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedPages([]);
    else setSelectedPages(map(filteredPages, "id"));
  };

  const handlePublish = () => {
    publishPage(
      { ids: uniq(selectedPages) },
      {
        onSuccess: () => {
          onClose();
          throwConfetti("CENTER_CENTER");
          setSelectedLanguage(fallbackLang);
        },
      },
    );
  };

  const getPageType = (pageType: string) => {
    if (pageType === "theme") return "Theme";
    const _pageType = find(pageTypes, { key: pageType });
    return _pageType ? _pageType?.name : pageType;
  };

  const formattedList = useMemo(() => {
    const onlinePages = [
      { label: "Updated", top: "pt-2" },
      ...orderBy(filter(allPages, { online: true }), "pageType"),
      ...orderBy(filter(allGlobalBlocks, { online: true }), "pageType"),
    ].filter((page) => page.pageType !== "theme" && page.pageType !== "design_tokens");

    const offlinePages = [
      { label: "Offline", top: "pt-6" },
      ...orderBy(filter(allPages, { online: false }), "pageType"),
      ...orderBy(filter(allGlobalBlocks, { online: false }), "pageType"),
    ];
    return [...onlinePages, ...offlinePages];
  }, [allPages, allGlobalBlocks]);

  return (
    <DialogContent className="flex max-h-[80%] max-w-4xl flex-col">
      <DialogHeader>
        <DialogTitle>Publish changes</DialogTitle>
        <DialogDescription className="text-xs">
          Select the pages you want to publish. Click publish when you're done.
        </DialogDescription>
      </DialogHeader>
      {languages.length > 0 && (
        <div className="my-[2px] mt-0">
          <LanguageSelector
            languages={[fallbackLang, ...languages]}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />
        </div>
      )}
      <div className="no-scrollbar relative -mx-4 -mt-4 h-full max-h-full overflow-y-auto">
        {isFetching ? (
          <div className="space-y-2 px-1">
            <div className="mt-2 h-6 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
          </div>
        ) : (
          <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400 rtl:text-right">
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="w-[1 50px] flex items-center gap-x-2 px-6 py-3">
                  <input
                    checked={isAllSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                    type="checkbox"
                    className="mt-1 cursor-pointer rounded focus:outline-none focus:ring-0"
                  />
                  Name
                </th>

                <th scope="col" className="w-[150px] px-2 py-3">
                  Type
                </th>
                <th scope="col" className="w-[150px] px-4 py-3 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {map(formattedList, (page) =>
                page.label ? (
                  <tr key="separator">
                    <td colSpan={3} className={`relative px-6 py-2 text-xs font-medium text-gray-800 ${page.top}`}>
                      <div className="absolute inset-0 left-6 flex items-center">
                        <div className="order-gray-300 w-full"></div>
                      </div>
                      <div className="relative flex justify-start">
                        <span className="bg-gray-50 pr-2">{page.label}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <SinglePageItem
                    page={page}
                    selectedPages={selectedPages}
                    handleCheckboxChange={handleCheckboxChange}
                    getPageType={getPageType}
                    hasSlug={hasSlug}
                    currentOwnerId={get(pageToUser, [page?.primaryPage || page?.id, "userId"])}
                  />
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
      <DialogFooter className="mt-10 flex items-center justify-center">
        {selectedPages.length > 0 && (
          <span className="text-center text-sm text-muted-foreground">
            {selectedPages.length} Page{selectedPages.length !== 1 ? "s" : ""} Selected
          </span>
        )}
        <Button disabled={isPending} variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isPending || isFetching || isEmpty(selectedPages)} onClick={handlePublish}>
          {isPending ? "Publishing..." : "Publish Selected"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default PublishPagesModalContent;
