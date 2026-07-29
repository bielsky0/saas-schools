import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useChaibuilderRealtime, usePageLockMeta, usePageLockStatus } from "./page-lock-hook";
import { EVENT, PAGE_STATUS } from "./page-lock-utils";

const TakeOverRequest = lazy(() => import("./take-over-request"));
const PageLockedDialog = lazy(() => import("./page-locked-dialog"));
const ActiveInAntherTabDialog = lazy(() => import("./active-in-another-tab"));
const ContinueEditingInThisClient = lazy(() => import("./continue-editing-in-this-client"));

// * HOC to wrap component with Suspense
const withSuspense = (Component: React.ComponentType<any>) => (
  <Suspense>
    <Component />
  </Suspense>
);

/**
 *
 * @param params
 * @returns Page Lock Components
 */
const PageLock = ({ isFetchingPageData }: { isFetchingPageData: boolean }) => {
  useChaibuilderRealtime();
  const { pageStatus } = usePageLockStatus();
  const { pageLockMeta } = usePageLockMeta();
  const queryClient = useQueryClient();
  const prevPageStatus = useRef(pageStatus);

  useEffect(() => {
    // * Refetching draft page data when page status is editing
    if (pageStatus === PAGE_STATUS.EDITING && prevPageStatus.current !== PAGE_STATUS.TAKE_OVER_REQUESTED) {
      queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_DRAFT_PAGE] });
    }
    prevPageStatus.current = pageStatus;
  }, [pageStatus, queryClient]);

  if (isFetchingPageData) return null;

  switch (pageStatus) {
    case PAGE_STATUS.EDITING:
    case PAGE_STATUS.CHECKING:
    case PAGE_STATUS.FORCE_TAKE_OVER:
      if (pageLockMeta.type === EVENT.CONTINUE_EDITING_IN_THIS_CLIENT) {
        return withSuspense(ContinueEditingInThisClient);
      }
      return null;

    case PAGE_STATUS.LOCKED:
      return withSuspense(PageLockedDialog);

    case PAGE_STATUS.TAKE_OVER_REQUESTED:
      return withSuspense(TakeOverRequest);

    case PAGE_STATUS.ACTIVE_IN_ANOTHER_TAB:
      return withSuspense(ActiveInAntherTabDialog);

    case PAGE_STATUS.CONNECTION_LOST:
      return <BlurContainer children={null} />;

    default:
      return null;
  }
};

export default PageLock;
