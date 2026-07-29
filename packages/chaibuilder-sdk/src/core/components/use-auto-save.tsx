import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { userActionsCountAtom } from "~/atoms/builder";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useSavePage } from "~/hooks/use-save-page";

export const useAutoSave = () => {
  const { savePage, saveState } = useSavePage();
  const autoSave = useBuilderProp("autoSave", true);
  const autoSaveActionsCount = useBuilderProp("autoSaveActionsCount", 10);
  const [actionsCount] = useAtom(userActionsCountAtom);
  useEffect(() => {
    if (!autoSave) return;
    if (saveState === "SAVED" || saveState === "SAVING") return;
    if (actionsCount >= autoSaveActionsCount) {
      savePage(true);
    }
  }, [autoSave, savePage, saveState, actionsCount, autoSaveActionsCount]);
};

export const useIncrementActionsCount = () => {
  const [, setActionsCount] = useAtom(userActionsCountAtom);
  const { setSaveState } = useSavePage();
  return useCallback(() => {
    setActionsCount((prev) => prev + 1);
    setSaveState((prev) => (prev !== "UNSAVED" ? "UNSAVED" : prev));
  }, [setActionsCount, setSaveState]);
};
