import { usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { useCallback } from "react";

export const useAccessToken = () => {
  const getAccessTokenFn = usePagesProp("getAccessToken");
  return {
    getAccessToken: useCallback(async () => {
      try {
        return await getAccessTokenFn();
      } catch {
        return "";
      }
    }, [getAccessTokenFn]),
  };
};
