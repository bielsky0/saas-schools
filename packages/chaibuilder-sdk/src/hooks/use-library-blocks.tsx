import { atom, useAtom } from "jotai";
import { get } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChaiLibrary, ChaiLibraryBlock } from "~/types/chaibuilder-editor-props";

export const libraryBlocksAtom = atom<{
  [uuid: string]: { loading: "idle" | "loading" | "complete"; blocks: any[] | null; error: boolean };
}>({});
export const useLibraryBlocks = (library?: Partial<ChaiLibrary> & { id: string }) => {
  const [libraryBlocks, setLibraryBlocks] = useAtom(libraryBlocksAtom);
  const getBlocks = useMemo(() => library?.getBlocksList || (() => []), [library]);
  const blocks = get(libraryBlocks, `${library?.id}.blocks`, null);
  const state = get(libraryBlocks, `${library?.id}.loading`, "idle") as "idle" | "loading" | "complete";
  const error = get(libraryBlocks, `${library?.id}.error`, false);
  const loadingRef = useRef<"idle" | "loading" | "complete">("idle");

  useEffect(() => {
    (async () => {
      if (!library) return;
      if (state === "complete" || loadingRef.current === "loading") return;
      loadingRef.current = "loading";
      setLibraryBlocks((prev) => ({ ...prev, [library?.id]: { loading: "loading", blocks: [], error: false } }));
      try {
        const libraryBlocks: ChaiLibraryBlock[] = await getBlocks(library);
        loadingRef.current = "idle";
        setLibraryBlocks((prev) => ({
          ...prev,
          [library?.id]: { loading: "complete", blocks: libraryBlocks || [], error: false },
        }));
      } catch {
        loadingRef.current = "idle";
        setLibraryBlocks((prev) => ({ ...prev, [library?.id]: { loading: "complete", blocks: [], error: true } }));
      }
    })();
  }, [library, blocks, state, loadingRef, setLibraryBlocks, getBlocks]);

  const resetLibrary = useCallback(
    (libraryId: string) => {
      setLibraryBlocks((prev) => ({ ...prev, [libraryId]: { loading: "idle", blocks: [], error: false } }));
    },
    [setLibraryBlocks],
  );

  return { data: blocks || [], isLoading: state === "loading", isError: error, resetLibrary };
};
