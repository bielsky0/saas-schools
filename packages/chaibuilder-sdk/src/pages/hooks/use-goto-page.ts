import { useCallback } from "react";
import { useChangePage } from "./use-change-page";

export const useGotoPage = () => {
  const changePage = useChangePage();
  return useCallback(
    ({ pageId }: { pageId: string }) => {
      changePage(pageId);
    },
    [changePage]
  );
};
