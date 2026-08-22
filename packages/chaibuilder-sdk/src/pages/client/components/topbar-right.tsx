import { compact, find, isEmpty, upperCase } from "lodash-es";
import { CheckCircle, ExternalLink, Loader, Play, Save, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { ChevronDownIcon } from "~/core/components/topbar/topbar-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useLanguages } from "~/hooks/use-languages";
import { useSavePage } from "~/hooks/use-save-page";
import PublishPages from "~/pages/client/components/publish-pages/publish-pages";
import { usePublishPages } from "~/pages/hooks/pages/mutations";
import { useCurrentActivePage, useGetPageFullSlug, usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useGetUnpublishedPartialBlocks } from "~/pages/hooks/pages/use-get-unpublished-partial-blocks";
import { useIsLanguagePageCreated } from "~/pages/hooks/pages/use-is-languagep-page-created";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useUnpublishedWebsiteSettings } from "~/pages/hooks/project/use-unpublished-website-settings";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { throwConfetti } from "~/pages/utils/confetti";
import Tooltip from "~/pages/utils/tooltip";
import { usePageLockStatus } from "./page-lock/page-lock-hook";

const UnpublishPage = lazy(() => import("~/pages/client/components/unpublish-page"));
const UnpublishedPartialsModal = lazy(
  () => import("~/pages/client/components/save-ui-blocks/unpublished-partials-modal"),
);

export const PreviewButton = () => {
  const { t } = useTranslation();
  const { selectedLang, fallbackLang } = useLanguages();
  const getPreviewUrl = usePagesProp("getPreviewUrl", async (_slug: string) => _slug);

  const [previewUrl, setPreviewUrl] = useState("");
  const { data: currentPage } = usePrimaryPage();
  const { data: languagePages } = useLanguagePages();
  const { data: pageTypes } = usePageTypes();
  const slug = useMemo(
    () => languagePages?.find((page) => page?.lang === selectedLang)?.slug,
    [selectedLang, languagePages],
  );
  const hasSlug = useCallback((pageType: string) => find(pageTypes, { key: pageType })?.hasSlug, [pageTypes]);
  const pageLang = selectedLang === fallbackLang ? "" : selectedLang;

  useEffect(() => {
    (async () => {
      if (typeof getPreviewUrl === "function") {
        const isPartial = !hasSlug(currentPage?.pageType);
        const url: string = await getPreviewUrl(
          isPartial ? `/_partial/${pageLang !== "" ? pageLang + "/" : ""}${currentPage?.id}` : slug || "",
        );
        setPreviewUrl(url);
      } else {
        setPreviewUrl("");
      }
    })();
  }, [getPreviewUrl, slug, currentPage?.pageType, hasSlug, currentPage?.id, pageLang]);

  return (
    <>
      <Tooltip content={t("Open preview in new tab")} delayDuration={0}>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="gap-2">
            <Play className="h-4 w-4" />
          </Button>
        </a>
      </Tooltip>
      <div className="h-4 w-px bg-gray-200" />
    </>
  );
};

const SaveButton = () => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const { isLocked } = usePageLockStatus();
  const { savePageAsync, saveState } = useSavePage();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === "UNSAVED") {
        event.preventDefault();
        event.returnValue = false;
      }
    };

    if (saveState === "UNSAVED") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveState]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    await savePageAsync();
    setIsSaving(false);
  }, [savePageAsync, isSaving]);

  const { buttonIcon, buttonClass, tooltipContent }: any = useMemo(() => {
    switch (saveState) {
      case "UNSAVED":
        return {
          tooltipContent: t("Save draft"),
          buttonIcon: <Save className="h-4 w-4" />,
          buttonClass: "gap-x-1",
        };
      case "SAVING":
        return {
          tooltipContent: t("Saving"),
          buttonIcon: <Loader className="h-4 w-4 animate-spin text-sky-700" />,
          buttonClass: "gap-x-1",
        };
      case "SAVED":
        return {
          tooltipContent: t("Saved"),
          buttonIcon: <CheckCircle className="h-4 w-4" />,
          buttonClass: "text-green-500 gap-x-1",
        };
    }
  }, [saveState, t]);

  if (isLocked) return null;

  return (
    <Tooltip content={tooltipContent}>
      <Button size="sm" variant="ghost" onClick={handleSave} className={`${buttonClass}`}>
        {buttonIcon}
      </Button>
    </Tooltip>
  );
};

export const PublishButton = () => {
  const { t } = useTranslation();
  const { selectedLang } = useLanguages();
  const { data: activePage } = useCurrentActivePage();
  const getUnpublishedPartialBlocks = useGetUnpublishedPartialBlocks();
  const [showModal, setShowModal] = useState(false);
  const [unpublishPage, setUnpublishPage] = useState(null);
  const { hasUnpublishedSettings, hasUnpublishedTheme } = useUnpublishedWebsiteSettings();
  const [showUnpublishedPartialsWarning, setShowUnpublishedPartialsWarning] = useState(false);
  const [unpublishedPartialBlockIds, setUnpublishedPartialBlockIds] = useState<string[]>([]);
  const [unpublishedPartialBlocksInfo, setUnpublishedPartialBlocksInfo] = useState<any[]>([]);
  const [, setComparePartial] = useState<{ id: string; name: string } | null>(null);

  const { data: currentPage } = usePrimaryPage();
  const { mutate: publishPage, isPending } = usePublishPages();
  const { needTranslations } = useSavePage();
  const needTranslation = needTranslations();
  const { buttonText, isPublished } = useMemo(() => {
    const isPublished = currentPage && currentPage?.online;
    const hasUnpublishedChanges = !isEmpty(currentPage?.changes);
    let buttonText = isPublished ? t("Published") : t("Publish");

    if (isPublished && hasUnpublishedChanges) {
      buttonText = t("Publish");
    }

    return {
      isPublished,
      buttonText,
    };
  }, [currentPage, t]);

  const handlePublishCurrentPage = async () => {
    if (needTranslation) {
      // setShowTranslationWarning(true);
      return;
    }

    checkAndPublish([activePage?.id, activePage?.primaryPage]);
  };

  const performPublishCurrentPage = (partialBlockIds?: string[]) => {
    const pages = [activePage?.id, activePage?.primaryPage, ...(Array.isArray(partialBlockIds) ? partialBlockIds : [])];
    // * Publishing current page and consumed global blocks
    publishPage({ ids: compact(pages) }, { onSuccess: () => throwConfetti("TOP_RIGHT") });
  };

  const checkAndPublish = useCallback(
    (pages: string[]) => {
      const { ids: unpublishedIds, partialBlocksInfo } = getUnpublishedPartialBlocks();
      if (unpublishedIds.length > 0) {
        setUnpublishedPartialBlockIds(unpublishedIds);
        setUnpublishedPartialBlocksInfo(partialBlocksInfo);
        setShowUnpublishedPartialsWarning(true);
      } else {
        publishPage({ ids: compact(pages) }, { onSuccess: () => throwConfetti("TOP_RIGHT") });
      }
    },
    [getUnpublishedPartialBlocks, publishPage],
  );

  const handleContinueWithPartials = () => {
    setShowUnpublishedPartialsWarning(false);
    performPublishCurrentPage(unpublishedPartialBlockIds);
    setUnpublishedPartialBlockIds([]);
    setUnpublishedPartialBlocksInfo([]);
  };

  const handleCancelPartials = () => {
    setShowUnpublishedPartialsWarning(false);
    setUnpublishedPartialBlockIds([]);
    setUnpublishedPartialBlocksInfo([]);
  };

  const handleViewPartialChanges = useCallback((partialId: string, partialName: string) => {
    setComparePartial({ id: partialId, name: partialName });
  }, []);

  return (
    <>
      <div className="flex">
        <Button
          size="sm"
          onClick={handlePublishCurrentPage}
          disabled={isPending || !currentPage?.id}
          className="h-8 rounded-l-md bg-[#005BD3] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3F86F2] disabled:pointer-events-none disabled:opacity-50">
          {buttonText}
          {selectedLang ? `(${upperCase(selectedLang)})` : ""}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={isPending || !currentPage?.id}
              aria-label={t("More publish options")}
              className="h-8 rounded-r-md border-l border-white/20 bg-[#005BD3] px-2 py-1.5 text-white transition-colors hover:bg-[#3F86F2] disabled:pointer-events-none disabled:opacity-50">
              <ChevronDownIcon className="h-4 w-4" />
              {hasUnpublishedSettings && (
                <>
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-orange-500" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="-mt-1 text-xs font-light text-gray-600">{t("Page")}</DropdownMenuLabel>
            {!isPublished && (
              <DropdownMenuItem
                disabled={isPending}
                className="cursor-pointer text-xs"
                onClick={() => checkAndPublish([currentPage?.id])}>
                {t("Publish")} page
              </DropdownMenuItem>
            )}
            {isPublished && (
              <DropdownMenuItem onClick={() => setUnpublishPage(activePage)} className="cursor-pointer text-xs">
                <TriangleAlert className="mr-0.5 h-3 w-3" />
                {t("Unpublish")} page {selectedLang ? `(${upperCase(selectedLang)})` : ""}
              </DropdownMenuItem>
            )}

            {hasUnpublishedSettings && (
              <>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuLabel className="-mt-1 text-xs font-light text-gray-600">
                  {t("Unpublished website settings")}
                </DropdownMenuLabel>
              </>
            )}
            {hasUnpublishedTheme && (
              <DropdownMenuItem
                disabled={isPending}
                className="cursor-pointer text-xs"
                onClick={() => publishPage({ ids: ["THEME"] }, { onSuccess: () => throwConfetti("TOP_RIGHT") })}>
                <span className="flex h-full w-full items-center gap-2">
                  <span className="mt-0.5 h-1 w-1 animate-pulse rounded-full bg-orange-500" />
                  {t("Publish")} theme
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <PublishPages showModal={showModal} onClose={() => setShowModal(false)} />
      {unpublishPage && (
        <Suspense>
          <UnpublishPage page={unpublishPage} onClose={() => setUnpublishPage(null)} />
        </Suspense>
      )}

      {showUnpublishedPartialsWarning && (
        <Suspense>
          <UnpublishedPartialsModal
            isOpen={showUnpublishedPartialsWarning}
            onClose={handleCancelPartials}
            onContinue={handleContinueWithPartials}
            onViewChanges={handleViewPartialChanges}
            isPending={isPending}
            partialBlocksInfo={unpublishedPartialBlocksInfo}
          />
        </Suspense>
      )}
    </>
  );
};

export const LiveLinkButton = () => {
  const { t } = useTranslation();
  const { data: currentPage } = usePrimaryPage();
  const fullUrl = useGetPageFullSlug();
  const isOnline = currentPage?.online;

  if (!isOnline) return null;

  return (
    <Tooltip content={t("Open live page")} delayDuration={0}>
      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="icon" className="ml-1 h-8 w-8">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </a>
    </Tooltip>
  );
};

export default function TopbarRight() {
  const { isLocked } = usePageLockStatus();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang");
  const isLanguagePageCreated = useIsLanguagePageCreated(lang as string);

  if (isLocked || !isLanguagePageCreated) return <div />;
  return (
    <div className="flex items-center justify-end gap-1">
      <PreviewButton />
      <SaveButton />
      <PublishButton />
      <LiveLinkButton />
    </div>
  );
}
