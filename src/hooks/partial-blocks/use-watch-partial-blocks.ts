import { useAtom } from "jotai";
import { get } from "lodash-es";
import { useEffect, useMemo, useRef } from "react";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { PartialBlockEntry } from "~/types/partial-blocks";
import { partialBlocksAtom } from "./atoms";
import { extractPartialIds } from "./utils";

export const useWatchPartialBlocks = () => {
  const [blocksStore] = useBlocksStore();
  const [partialBlocks, setPartialBlocks] = useAtom(partialBlocksAtom);
  const getPartialBlockBlocks = useBuilderProp("getPartialBlockBlocks", async (_key: string) => []);
  const fetchingRef = useRef<Set<string>>(new Set());

  // Collect partial block IDs from page blocks
  const pagePartialBlocksList = useMemo(() => {
    return blocksStore
      .filter((block) => block._type === "PartialBlock" || block._type === "GlobalBlock")
      .map((block) => get(block, "partialBlockId", get(block, "globalBlock", "")))
      .filter(Boolean) as string[];
  }, [blocksStore]);

  // Also collect partial block IDs from already fetched partial blocks (nested partials)
  const nestedPartialBlocksList = useMemo(() => {
    const nestedIds: string[] = [];
    Object.values(partialBlocks).forEach((entry) => {
      if (entry.status === "loaded") {
        nestedIds.push(...entry.dependencies);
      }
    });
    return nestedIds;
  }, [partialBlocks]);

  // Combine page partials and nested partials, deduplicated
  const partialBlocksList = useMemo(() => {
    return [...new Set([...pagePartialBlocksList, ...nestedPartialBlocksList])];
  }, [pagePartialBlocksList, nestedPartialBlocksList]);

  // Queue-based fetching with ref to prevent duplicate fetches
  useEffect(() => {
    const toFetch = partialBlocksList.filter((id) => {
      const entry = partialBlocks[id];
      const isAlreadyFetching = fetchingRef.current.has(id);
      const needsFetch = !entry || entry.status === "idle";
      return needsFetch && !isAlreadyFetching;
    });

    if (toFetch.length === 0) return;

    // Mark as fetching
    toFetch.forEach((id) => fetchingRef.current.add(id));

    // Set loading state for all
    setPartialBlocks((prev) => {
      const updates: Record<string, PartialBlockEntry> = {};
      toFetch.forEach((id) => {
        updates[id] = { blocks: [], dependencies: [], status: "loading" };
      });
      return { ...prev, ...updates };
    });

    // Fetch all in parallel
    Promise.all(
      toFetch.map(async (partialBlockId) => {
        try {
          const blocks = await getPartialBlockBlocks(partialBlockId);
          const dependencies = extractPartialIds(blocks);
          setPartialBlocks((prev) => ({
            ...prev,
            [partialBlockId]: { blocks, dependencies, status: "loaded" },
          }));
        } catch (error) {
          setPartialBlocks((prev) => ({
            ...prev,
            [partialBlockId]: {
              blocks: [],
              dependencies: [],
              status: "error",
              error: error instanceof Error ? error.message : "Failed to fetch",
            },
          }));
        } finally {
          fetchingRef.current.delete(partialBlockId);
        }
      }),
    );
  }, [partialBlocksList, partialBlocks, setPartialBlocks, getPartialBlockBlocks]);
};
