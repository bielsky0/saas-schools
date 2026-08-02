import { find, get, isEmpty } from "lodash-es";
import { ChevronRight, File, Hash, Lock, MoreHorizontal, Pencil, Plus, StarsIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageActionsDropdown } from "~/pages/client/components/page-action-dropdown";
import { usePageToUser } from "~/pages/client/components/page-lock/page-lock-hook";
import { useUserId } from "~/pages/client/components/page-lock/page-lock-utils";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useChaiUserInfo } from "~/pages/hooks/utils/use-chai-user-info";
import { usePageExpandManager } from "~/pages/hooks/utils/use-page-expand-manager";
import { ChaiPage } from "~/pages/utils/page-organization";
import Tooltip from "~/pages/utils/tooltip";
import { PageLinkContextMenu } from "./page-link-context-menu";

/**
 * ExpandCollapse
 * @param page - The ChaiPage node to control expand/collapse state for
 */
const ExpandCollapse = ({ page }: { page: ChaiPage }) => {
  const { isExpanded, toggleExpanded } = usePageExpandManager(page?.id);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleExpanded();
      }}
      disabled={!page?.children?.length}
      className={`flex h-[calc(100%-2px)] w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:px-1 hover:text-gray-500 ${!page?.children?.length ? "opacity-0" : "hover:text-blue-400"}`}>
      <ChevronRight
        size={12}
        className={`stroke-[4] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
      />
    </button>
  );
};

/**
 * PageIcon
 * @param page - The ChaiPage node
 * @param pageType - The type object for the page
 */
const PageIcon = ({ page, pageType }: { page: ChaiPage; pageType: any }) => {
  return (
    <div className="flex h-full items-center justify-center gap-x-1">
      {page.dynamic ? (
        <StarsIcon size={12} className="text-yellow-400" />
      ) : pageType?.icon ? (
        <div
          className="flex h-4 max-h-4 w-4 max-w-4 items-center justify-center stroke-[1] text-slate-500"
          dangerouslySetInnerHTML={{ __html: pageType.icon }}
        />
      ) : !pageType?.hasSlug ? (
        <Hash size={12} className="stroke-[1] text-slate-500" />
      ) : (
        <File size={12} className="stroke-[1] text-slate-500" />
      )}
    </div>
  );
};

/**
 * PageStatus
 * Renders a short status badge: Live (published), Robocza (draft), Ukryta (archived).
 * @param page - The ChaiPage node to render the status for
 */
const PageStatus = ({ page }: { page: ChaiPage }) => {
  const { t } = useTranslation();
  let label: string;
  let className: string;
  if (page.status === "archived") {
    label = t("Status archived");
    className = "bg-gray-200 text-gray-600";
  } else if (page.online) {
    label = t("Status live");
    className = "bg-green-100 text-green-700";
  } else {
    label = t("Status draft");
    className = "bg-amber-100 text-amber-700";
  }
  return <span className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium ${className}`}>{label}</span>;
};

/**
 *
 * PageItem
 * @param page - The ChaiPage node to render
 * @param pageTypes - List of all page types for lookup
 * @param currentPage - ID of the currently active page
 * @param onClickAction - Function to handle action clicks
 */
const PageItem = ({
  page,
  pageTypes,
  currentPage,
  onClickAction,
  languagePages,
  selectedLanguage,
  showUntranslatedPages,
}: {
  page: ChaiPage;
  pageTypes: any;
  currentPage: string;
  onClickAction: (action: string, page: any) => void;
  languagePages: Record<string, ChaiPage>;
  selectedLanguage: string;
  showUntranslatedPages: boolean;
}) => {
  const userId = useUserId();
  const { pageToUser } = usePageToUser();
  const pageOwnerId = get(pageToUser, [page?.id, "userId"]);
  const { data: pageOwnerData } = useChaiUserInfo(pageOwnerId);
  const pageOwner = pageOwnerData && userId !== pageOwnerId ? pageOwnerData?.name : null;

  const fallbackLang = useFallbackLang();
  const isSelected = currentPage === page.id;
  const pageType = useMemo(() => find(pageTypes, { key: page.pageType }), [pageTypes, page.pageType]);

  // * Check
  let langPage: any = get(languagePages, page?.id);
  langPage = get(langPage, "lang") === selectedLanguage ? langPage : null;
  const hasLangPage = selectedLanguage === fallbackLang || Boolean(langPage);

  // * Getting page name and page slug
  const pageName = langPage?.name || page?.name || "No name";
  let pageSlug = langPage?.slug || page?.slug || "";
  const fullSlug =
    pageSlug +
    (page?.dynamic ? `/${pageType?.dynamicSlug}` : "") +
    (page?.dynamicSlugCustom ? `${page.dynamicSlugCustom}` : "");

  if (pageSlug.startsWith("/") && !showUntranslatedPages) {
    const last = pageSlug.split("/").pop();
    pageSlug = pageSlug.endsWith(last) && page.dynamic ? "" : `/${last}`;
  }

  const containerClass = useMemo(() => {
    const baseClass = `flex h-7 min-w-0 flex-1 cursor-pointer select-none items-center gap-x-1.5 rounded px-px text-xs duration-300 border-[1px]`;
    const activeClass = `${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-gray-200 hover:bg-gray-100"}`;

    if (!hasLangPage)
      return `${baseClass} bg-gray-100 opacity-50 group-hover:border-gray-200 border-transparent group-hover:bg-blue-100`;

    return `${baseClass} ${activeClass} ${pageOwner ? "opacity-60" : ""}`;
  }, [hasLangPage, isSelected, pageOwner]);

  const hasUnpublishedChanges = useMemo(() => {
    if (page.isPartialGroup) return false;
    if (langPage) {
      if (!langPage.online || isEmpty(langPage.changes)) return false;
    } else if (page) {
      if (!page.online || isEmpty(page.changes)) return false;
    }
    return true;
  }, [langPage, page]);

  return (
    <div className="group relative">
      <PageLinkContextMenu pageId={page.id}>
        <div
          onClick={() => !page.isPartialGroup && hasLangPage && onClickAction("select", page?.id)}
          className={containerClass}>
          <ExpandCollapse page={page} />
          {!page.isPartialGroup && <PageStatus page={page} />}
          {!page.isPartialGroup && <PageIcon page={page} pageType={pageType} />}

          <Tooltip content={pageName} side="top" showTooltip={pageName.length > 35}>
            <span className="max-w-[40%] truncate font-medium text-black">{pageName}</span>
          </Tooltip>
          {(pageSlug || page.dynamic) && (
            <Tooltip content={fullSlug} side="top" showTooltip>
              <span className="max-w-[40%] truncate font-mono text-xs text-muted-foreground">
                {pageSlug}
                {page.dynamic && pageType?.dynamicSlug && (
                  <span className="text-xs text-gray-500">
                    /{pageType?.dynamicSlug}
                    {page.dynamicSlugCustom}
                  </span>
                )}
              </span>
            </Tooltip>
          )}
          {hasUnpublishedChanges && (
            <Tooltip content="Has unpublished changes" side="top">
              <span className="text-amber-500">
                <Pencil size={12} className="stroke-[2]" />
              </span>
            </Tooltip>
          )}
          {/* HIDDEN: Template icon indicator
          {isTemplate && (
            <Tooltip content="Template" side="top">
              <span className="text-blue-500">
                <NotepadText size={16} />
              </span>
            </Tooltip>
          )}
          */}

          {!page.isPartialGroup && hasLangPage && !pageOwner ? (
            <div className="duration absolute right-0.5 top-[3px]">
              <PageActionsDropdown
                isLanguagePage={Boolean(langPage)}
                page={langPage || page}
                setDuplicatePage={(arg) => onClickAction("duplicate", arg)}
                setAddEditPage={(arg) => onClickAction("edit", langPage || arg)}
                setUnpublishPage={(arg) => onClickAction("unpublish", arg)}
                setDeletePage={(arg) => onClickAction("delete", langPage || arg)}
                setMarkAsTemplate={(arg) => onClickAction("markAsTemplate", arg)}
                setUnmarkAsTemplate={(arg) => onClickAction("unmarkAsTemplate", arg)}>
                <div className="m-0 cursor-pointer rounded border border-transparent p-0.5 duration-100 hover:border-gray-400 hover:bg-white">
                  <MoreHorizontal className="h-4 w-4" onClick={(e) => e.stopPropagation()} />
                </div>
              </PageActionsDropdown>
            </div>
          ) : pageOwner ? (
            <span className="duration absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-x-1 text-xs text-red-500">
              <Lock className="h-3 w-3 fill-red-200 text-red-500" />
              <Tooltip content={`${pageOwner} is editing this page`}>
                <span className="font-bold">{pageOwner}</span>
              </Tooltip>
            </span>
          ) : null}
        </div>
      </PageLinkContextMenu>
      <>
        {!hasLangPage && !page.isPartialGroup && !pageOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClickAction("addLanguagePage", { language: selectedLanguage, page });
            }}
            className="absolute left-1/2 top-1 flex -translate-x-1/2 items-center gap-x-1 rounded bg-blue-500 px-2 py-0.5 text-xs text-white opacity-0 duration-200 hover:bg-blue-700 group-hover:opacity-100">
            <Plus size={12} className="stroke-[3]" />{" "}
            <span className="text-[10px]">Add {get(LANGUAGES, selectedLanguage)} Page</span>
          </button>
        )}
      </>
    </div>
  );
};

export default PageItem;
