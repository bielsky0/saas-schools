import { useDebouncedCallback } from "@react-hookz/web";
import { useCallback, useRef } from "react";
import { chaiDesignTokensAtom } from "~/atoms/builder";
import { builderStore } from "~/atoms/store";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useTheme } from "~/hooks/use-theme";
import { ChaiDesignTokens, ChaiSaveWebsiteData, ChaiTheme } from "~/types";

export const useSaveWebsiteData = () => {
  const onSaveWebsiteData = useBuilderProp("onSaveWebsiteData", async (_data: ChaiSaveWebsiteData) => {});
  const [theme] = useTheme();
  const isSavingRef = useRef(false);

  const saveWebsiteData = useCallback(
    async (data: ChaiSaveWebsiteData) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await onSaveWebsiteData(data);
      } finally {
        isSavingRef.current = false;
      }
    },
    [onSaveWebsiteData],
  );

  const saveTheme = useCallback(
    async (themeData?: ChaiTheme) => {
      await saveWebsiteData({ type: "THEME", data: themeData ?? theme });
    },
    [saveWebsiteData, theme],
  );

  const saveDesignTokens = useCallback(
    async (tokens?: ChaiDesignTokens) => {
      // Get latest from store if not provided
      const data = tokens ?? builderStore.get(chaiDesignTokensAtom);
      await saveWebsiteData({ type: "DESIGN_TOKENS", data });
    },
    [saveWebsiteData],
  );

  const debouncedSaveTheme = useDebouncedCallback(saveTheme, [saveTheme], 1000);

  const debouncedSaveDesignTokens = useDebouncedCallback(saveDesignTokens, [saveDesignTokens], 1000);

  return {
    saveWebsiteData,
    saveTheme,
    saveDesignTokens,
    debouncedSaveTheme,
    debouncedSaveDesignTokens,
  };
};
