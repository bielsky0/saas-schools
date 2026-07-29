import { isEmpty } from "lodash-es";
import { Folder } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useSavePage } from "~/hooks/use-save-page";
import { usePageLockStatus } from "~/pages/client/components/page-lock/page-lock-hook";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
const PagesManagerNew = lazy(() => import("./page-manager-new"));

const PagesManagerTrigger = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page");
  const { data: primaryPage, isFetching } = usePrimaryPage();
  const { data: allPages, isFetching: isPagesLoading } = useWebsitePrimaryPages();
  const [pageManager, setPageManager] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { savePage } = useSavePage();
  const canClose = !!page && !isEmpty(primaryPage);
  const { isLocked } = usePageLockStatus();

  useEffect(() => {
    if (!isPagesLoading && allPages) setIsInitialLoad(false);
  }, [isPagesLoading, allPages]);

  // Open the page manager
  const shouldOpenForMissingPage = !isInitialLoad && !page;
  const shouldOpenForEmptyPage = !isInitialLoad && !isFetching && isEmpty(primaryPage);
  const isOpen = pageManager || shouldOpenForMissingPage || shouldOpenForEmptyPage;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          asChild
          onClick={() => {
            if (!isLocked) savePage();
            setPageManager(true);
          }}>
          {children || (
            <Button
              variant="ghost"
              key={"template-viewer"}
              className="flex w-full items-center justify-center rounded-md p-2 pl-0">
              <Folder className="ml-2 h-10 w-10 fill-primary text-primary" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">{t("Pages")}</span>
              </div>
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t("Open pages manager")}</p>
        </TooltipContent>
      </Tooltip>
      <Sheet open={isOpen} onOpenChange={(open) => !open && canClose && setPageManager(false)}>
        <SheetContent
          side={"left"}
          aria-describedby="pages-manager-description"
          className={`z-50 !min-w-[50vh] !max-w-[800px] border-border p-0 ${!canClose ? "sheet-hide-close-btn" : ""}`}>
          <SheetHeader className={`mb-3 px-4 pt-4`}>
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Folder className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{t("Pages")}</span>
                <span id="pages-manager-description" className="text-xs font-normal text-muted-foreground">
                  {t("Manage your site structure")}
                </span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">{t("Manage your site structure")}</SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            {isOpen && (
              <Suspense>
                <PagesManagerNew close={() => setPageManager(false)} />
              </Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PagesManagerTrigger;
