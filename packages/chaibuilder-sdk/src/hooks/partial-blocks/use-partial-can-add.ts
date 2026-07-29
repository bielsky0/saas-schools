import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { MAX_PARTIAL_DEPTH } from "~/core/constants/partial-blocks";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { CanAddPartialResult } from "~/types/partial-blocks";
import { partialBlocksAtom } from "./atoms";
import { getPartialDepth, wouldCreateCycle } from "./utils";

export const usePartialDependencies = () => {
  const [partialBlocks] = useAtom(partialBlocksAtom);
  return useMemo(() => {
    const deps: Record<string, string[]> = {};
    Object.entries(partialBlocks).forEach(([id, entry]) => {
      deps[id] = entry.dependencies;
    });
    return deps;
  }, [partialBlocks]);
};

export const useCanAddPartial = (targetPartialId: string): CanAddPartialResult => {
  const currentPageId = useBuilderProp("pageId", "");
  const dependencies = usePartialDependencies();

  return useMemo(() => {
    // If not editing a partial (regular page), allow all
    if (!currentPageId) return { canAdd: true };

    // Self-reference check
    if (currentPageId === targetPartialId) {
      return { canAdd: false, reason: "Cannot add a partial inside itself" };
    }

    // Circular dependency check
    if (wouldCreateCycle(currentPageId, targetPartialId, dependencies)) {
      return { canAdd: false, reason: "Adding this partial would create a circular reference" };
    }

    // Depth check - calculate what the new depth would be
    const currentDepth = getPartialDepth(currentPageId, dependencies);
    const targetDepth = getPartialDepth(targetPartialId, dependencies);
    const newDepth = Math.max(currentDepth, 1 + targetDepth);
    if (newDepth > MAX_PARTIAL_DEPTH) {
      return { canAdd: false, reason: `Maximum nesting depth (${MAX_PARTIAL_DEPTH} levels) would be exceeded` };
    }

    return { canAdd: true };
  }, [currentPageId, targetPartialId, dependencies]);
};

export const useCheckPartialCanAdd = () => {
  const currentPageId = useBuilderProp("pageId", "");
  const dependencies = usePartialDependencies();

  return useCallback(
    (targetPartialId: string): CanAddPartialResult => {
      // If not editing a partial (regular page), allow all
      if (!currentPageId) return { canAdd: true };

      // Self-reference check
      if (currentPageId === targetPartialId) {
        return { canAdd: false, reason: "Cannot add a partial inside itself" };
      }

      // Circular dependency check
      if (wouldCreateCycle(currentPageId, targetPartialId, dependencies)) {
        return { canAdd: false, reason: "Adding this partial would create a circular reference" };
      }

      // Depth check
      const currentDepth = getPartialDepth(currentPageId, dependencies);
      const targetDepth = getPartialDepth(targetPartialId, dependencies);
      const newDepth = Math.max(currentDepth, 1 + targetDepth);
      if (newDepth > MAX_PARTIAL_DEPTH) {
        return { canAdd: false, reason: `Maximum nesting depth (${MAX_PARTIAL_DEPTH} levels) would be exceeded` };
      }

      return { canAdd: true };
    },
    [currentPageId, dependencies],
  );
};
