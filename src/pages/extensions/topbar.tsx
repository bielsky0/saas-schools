import { get } from "lodash-es";
import { ChevronRight } from "lucide-react";
import { lazy, Suspense } from "react";
import { CanvasTopBar } from "~/core/components/canvas/topbar/canvas-top-bar";
import { mergeClasses } from "~/core/main";
import { PageDropdownInHeader } from "~/pages/client/components/page-dropdown-in-header";
import { ScreenOverlay } from "~/pages/client/components/screen-overlay";
import TopbarLeft from "~/pages/client/components/topbar-left";
import TopbarRight from "~/pages/client/components/topbar-right";
import { useCurrentActivePage, usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useDynamicPageSelector } from "~/pages/hooks/pages/use-dynamic-page-selector";
import { useChaiFeatureFlag } from "~/runtime/client";
import PagesManagerTrigger from "../client/components/page-manager/page-manager-trigger";
const DynamicPageSelector = lazy(() => import("../client/components/dynamic-page-selector"));

const DynamicPageSelectorSuspense = () => {
  const { dynamicPage, allLangPages, isFetching: isFetchingDynamicPage } = useDynamicPageSelector();
  const hasDynamicPage = allLangPages.length > 0;

  if (isFetchingDynamicPage) return null;
  return (
    <div className="relative">
      {!dynamicPage && <ScreenOverlay hasDynamicPage={hasDynamicPage} />}
      <Suspense>
        <DynamicPageSelector />
      </Suspense>
    </div>
  );
};

const AddressBar = () => {
  const { isFetching: isFetchingActivePage } = useCurrentActivePage();
  const { data: page, isFetching: isFetchingCurrentPage } = usePrimaryPage();
  const dynamic = get(page, "dynamic", false);
  const isDynamicPageSelectorEnabled = useChaiFeatureFlag("dynamic-page-selector");
  const isFetching = isFetchingActivePage || isFetchingCurrentPage;

  return (
    <div className={`relative flex items-center`}>
      <div className="flex items-center">
        {/* PagesManagerTrigger */}
        <div className={mergeClasses("flex h-8 items-center", isFetching && "max-w-0 overflow-hidden opacity-0")}>
          <PagesManagerTrigger />
        </div>

        {/* ChevronRight */}
        <ChevronRight className="mx-1 h-3 w-3 flex-shrink-0 text-gray-400" />

        {/* PageDropdownInHeader */}
        <div className={mergeClasses("flex h-8 items-center", isFetching && "max-w-0 overflow-hidden opacity-0")}>
          <PageDropdownInHeader />
        </div>
      </div>

      {dynamic && isDynamicPageSelectorEnabled && <DynamicPageSelectorSuspense />}
    </div>
  );
};

export const Topbar = () => {
  return (
    <div className="grid h-full w-full grid-cols-3 items-center px-2">
      <div className="flex justify-start">
        <TopbarLeft />
        <AddressBar />
      </div>
      <div className="flex justify-center">
        <CanvasTopBar />
      </div>
      <div className="flex items-center justify-end">
        <TopbarRight />
      </div>
    </div>
  );
};
