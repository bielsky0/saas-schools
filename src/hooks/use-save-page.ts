import { useThrottledCallback } from "@react-hookz/web";
import { atom, useAtom, useAtomValue } from "jotai";
import { compact, has, isEmpty, noop } from "lodash-es";
import { useCallback } from "react";
import { userActionsCountAtom } from "~/atoms/builder";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useCheckStructure } from "~/hooks/use-check-structure";
import { useGetPageData } from "~/hooks/use-get-page-data";
import { useIsPageLoaded } from "~/hooks/use-is-page-loaded";
import { useLanguages } from "~/hooks/use-languages";
import { usePermissions } from "~/hooks/use-permissions";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlock } from "~/types/common";
import { extractPartialIds, partialBlocksAtom } from "./partial-blocks";

export const builderSaveStateAtom = atom<"SAVED" | "SAVING" | "UNSAVED">("SAVED"); // SAVING
builderSaveStateAtom.debugLabel = "builderSaveStateAtom";

export const checkMissingTranslations = (blocks: any[], lang: string): boolean => {
  if (!lang) return false;

  return blocks.some((block) => {
    if (!block?._type || block._type === "PartialBlock") {
      return false;
    }

    try {
      const blockDef = getRegisteredChaiBlock(block._type);
      if (!blockDef) return false;

      const i18nProps = has(blockDef, "i18nProps") ? (blockDef.i18nProps ?? []) : [];

      return i18nProps.some((prop: string) => {
        const translatedProp = `${prop}-${lang}`;
        return !block[translatedProp] || isEmpty(block[translatedProp]);
      });
    } catch (error) {
      console.warn(`Failed to get block definition for type: ${block._type}`, error);
      return false;
    }
  });
};

export const useSavePage = () => {
  const [saveState, setSaveState] = useAtom(builderSaveStateAtom);
  const onSave = useBuilderProp("onSave", async (_error: any) => {});
  const onSaveStateChange = useBuilderProp("onSaveStateChange", noop);
  const getPageData = useGetPageData();
  const { hasPermission } = usePermissions();
  const { selectedLang, fallbackLang } = useLanguages();
  const [isPageLoaded] = useIsPageLoaded();
  const partialBlocksStore = useAtomValue(partialBlocksAtom);
  const checkStructure = useCheckStructure();
  const [, setActionsCount] = useAtom(userActionsCountAtom);

  const needTranslations = () => {
    const pageData = getPageData();
    return !selectedLang || selectedLang === fallbackLang
      ? false
      : checkMissingTranslations(pageData.blocks || [], selectedLang);
  };

  const getAllPartialIds = useCallback(
    (blocks: ChaiBlock[]): string[] => {
      const collected = new Set<string>();
      const queue = extractPartialIds(blocks);

      while (queue.length > 0) {
        const id = queue.shift()!;
        if (collected.has(id)) continue;
        collected.add(id);

        const entry = partialBlocksStore[id];
        if (entry?.status === "loaded" && entry.dependencies.length > 0) {
          queue.push(...entry.dependencies);
        }
      }

      return [...collected];
    },
    [partialBlocksStore],
  );

  const getLinkPageIds = useCallback((blocks: ChaiBlock[]): string[] => {
    const blocksStr = JSON.stringify(blocks);
    const regex = /pageType:[^:]+:([a-f0-9-]{36})/gi;
    const uuids: string[] = [];
    let match;
    while ((match = regex.exec(blocksStr)) !== null) {
      if (match[1]) uuids.push(match[1]);
    }
    return compact([...new Set(uuids)]);
  }, []);

  const getDesignTokens = useCallback((blocks: ChaiBlock[]): Record<string, Record<string, string>> => {
    const regex = /dt#[^ "]+/g;
    const result: Record<string, Record<string, string>> = {};
    for (const block of blocks) {
      const blockStr = JSON.stringify(block);
      let match;
      while ((match = regex.exec(blockStr)) !== null) {
        if (match[0]) {
          const tokenId = match[0];
          if (!result[tokenId]) {
            result[tokenId] = {};
          }
          result[tokenId][block._id] = block._name || block._type;
        }
      }
    }
    return result;
  }, []);

  const shouldSkipSave = useCallback(
    (force: boolean) => {
      // Skip save if no permission or page not loaded
      if (!force && (!hasPermission("save_page") || !isPageLoaded)) {
        return true;
      }
      // Skip save if there are no unsaved changes
      if (!force && saveState === "SAVED") {
        return true;
      }
      return false;
    },
    [hasPermission, isPageLoaded, saveState],
  );

  const savePage = useThrottledCallback(
    async (autoSave: boolean = false, force: boolean = false) => {
      if (shouldSkipSave(force)) {
        return;
      }
      // Run structure validation before saving
      const pageData = getPageData();
      if (pageData?.blocks) {
        // @ts-expect-error - checkStructure expects specific block types
        checkStructure(pageData.blocks);
      }
      setSaveState("SAVING");
      onSaveStateChange("SAVING");
      setActionsCount(0);
      await onSave({
        autoSave,
        blocks: pageData.blocks,
        needTranslations: needTranslations(),
        partialIds: getAllPartialIds((pageData.blocks as unknown as ChaiBlock[]) || []),
        linkPageIds: getLinkPageIds((pageData.blocks as unknown as ChaiBlock[]) || []),
        designTokens: getDesignTokens((pageData.blocks as unknown as ChaiBlock[]) || []),
      });
      setTimeout(() => {
        setSaveState("SAVED");
        onSaveStateChange("SAVED");
      }, 100);
      return true;
    },
    [
      shouldSkipSave,
      getPageData,
      setSaveState,
      setActionsCount,
      onSave,
      onSaveStateChange,
      isPageLoaded,
      checkStructure,
      getAllPartialIds,
      getLinkPageIds,
      getDesignTokens,
    ],
    3000, // save only every 3 seconds
  );

  const savePageAsync = async (force: boolean = false) => {
    if (shouldSkipSave(force)) {
      return;
    }
    setSaveState("SAVING");
    onSaveStateChange("SAVING");
    const pageData = getPageData();
    setActionsCount(0);
    await onSave({
      autoSave: true,
      blocks: pageData.blocks,
      needTranslations: needTranslations(),
      partialIds: getAllPartialIds((pageData.blocks as unknown as ChaiBlock[]) || []),
      linkPageIds: getLinkPageIds((pageData.blocks as unknown as ChaiBlock[]) || []),
      designTokens: getDesignTokens((pageData.blocks as unknown as ChaiBlock[]) || []),
    });
    setTimeout(() => {
      setSaveState("SAVED");
      onSaveStateChange("SAVED");
    }, 100);
    return true;
  };

  return { savePage, savePageAsync, saveState, setSaveState, needTranslations };
};
