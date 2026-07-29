import { get, isEmpty } from "lodash-es";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useLanguages } from "~/hooks/use-languages";
import { useSidebarActivePanel } from "~/hooks/use-sidebar-active-panel";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { useDeletePage } from "~/pages/hooks/pages/mutations";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useSiteWideUsage } from "~/pages/hooks/use-site-wide-usage";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { ChaiPage } from "~/pages/utils/page-organization";
import { ChaiPageType } from "~/types/actions";

// Helper function to recursively count all child pages
const countAllChildren = (pageId: string, allPages: ChaiPage[]): number => {
  const children = allPages.filter((p) => p.parent === pageId);
  if (children.length === 0) return 0;

  let count = children.length;
  children.forEach((child) => {
    count += countAllChildren(child.id, allPages);
  });

  return count;
};

function DeletePage({ page, onClose }: { page: any; onClose: () => void }) {
  const { t } = useTranslation();
  const [, setQueryParams] = useSearchParams();
  const { mutate: deletePage, isPending: isDeleting } = useDeletePage();
  const { data: pageTypes } = usePageTypes();
  const { data: allPages = [] } = useWebsitePrimaryPages();
  const { setSelectedLang, fallbackLang } = useLanguages();
  const [, setActivePanel] = useSidebarActivePanel();
  const isPrimaryPage = !page?.primaryPage;
  const { data: languagePages = [] } = useLanguagePages(isPrimaryPage ? page?.id : undefined);
  const { data: siteWideUsage } = useSiteWideUsage();

  const isPartial = useMemo(() => isEmpty(page?.slug), [page?.slug]);

  const pagesUsingPartial = useMemo(() => {
    if (!isPartial || !page?.id || !siteWideUsage) return [];

    const affectedPages: { id: string; name: string }[] = [];
    Object.entries(siteWideUsage).forEach(([pageId, usage]) => {
      if (usage.partialBlocks.includes(page.id) && !usage.isPartial) {
        affectedPages.push({ id: pageId, name: usage.name });
      }
    });

    return affectedPages;
  }, [isPartial, page.id, siteWideUsage]);

  const languagePagesCount = useMemo(() => {
    if (!isPrimaryPage || !languagePages) return 0;
    return languagePages.filter((lp: any) => lp.id !== page.id).length;
  }, [isPrimaryPage, languagePages, page.id]);

  const childPageCount = useMemo(() => {
    if (!page?.id || !allPages.length) return 0;

    let totalChildren = countAllChildren(page.id, allPages);

    if (isPrimaryPage && languagePages && languagePages.length > 0) {
      languagePages.forEach((langPage: any) => {
        if (langPage.id !== page.id) {
          totalChildren += countAllChildren(langPage.id, allPages);
        }
      });
    }

    return totalChildren;
  }, [page.id, allPages, isPrimaryPage, languagePages]);

  const handleDelete = () => {
    if (isDeleting) return;
    deletePage(page, {
      onSuccess: () => {
        if (!page?.primaryPage) {
          window.history.replaceState({}, "", "/");
          setQueryParams(new URLSearchParams());
        } else {
          window.history.replaceState({}, "", `/?page=${page.primaryPage}`);
          setQueryParams(new URLSearchParams({ page: page.primaryPage }));
        }
        window.dispatchEvent(new PopStateEvent("popstate"));
        setSelectedLang(fallbackLang);
        setActivePanel("outline");
        onClose();
      },
    });
  };

  const pageTypeObject = pageTypes?.find((type: ChaiPageType) => type.key === page?.pageType);

  return (
    <Dialog open={!!page} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Confirm Deletion")}</DialogTitle>
          <DialogDescription className="py-4 text-slate-500">
            <div>
              {t("Are you sure you want to remove")} <b>{page?.name ?? page?.slug}</b>{" "}
              {pageTypeObject?.hasSlug ? pageTypeObject?.name + "?" : t("page?")}
            </div>

            {/* Warning for primary page with language pages or nested children */}
            {isPrimaryPage && (languagePagesCount > 0 || childPageCount > 0) && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm">
                <div className="font-semibold text-red-800">
                  {t("Warning: Deleting this primary page will also delete")}:
                </div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-red-700">
                  {childPageCount > 0 && (
                    <li>
                      <span className="font-medium">{childPageCount}</span>{" "}
                      {childPageCount === 1 ? t("nested child page") : t("nested child pages")}
                    </li>
                  )}
                  {languagePagesCount > 0 && <li>{t("All associated language pages")}</li>}
                </ul>
              </div>
            )}

            {/* Warning for partial being used in pages */}
            {isPartial && pagesUsingPartial.length > 0 && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm">
                <div className="font-semibold text-red-800">
                  {t("Warning: This partial is currently used in the following pages")}:
                </div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-red-700">
                  {pagesUsingPartial.map(({ id, name }) => (
                    <li key={id}>
                      <span className="font-medium">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {page.lang && (
              <div className="py-2 text-sm">
                {t("Language")}:{" "}
                <span className="font-medium text-gray-500">{get(LANGUAGES, page.lang, page.lang)}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? t("Deleting...") : t("Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeletePage;
