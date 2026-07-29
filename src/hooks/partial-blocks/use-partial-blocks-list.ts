import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { PartialBlockList } from "~/types/partial-blocks";
import { partialBlocksListAtom } from "./atoms";

export const usePartialBlocksList = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialBlocksList, setPartialBlocksList] = useAtom(partialBlocksListAtom);
  const getPartialBlocks = useBuilderProp("getPartialBlocks", async () => ({}) as PartialBlockList);

  const fetchPartialBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const partialBlocks = await getPartialBlocks();
      setPartialBlocksList(partialBlocks as PartialBlockList);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch partial blocks");
      setLoading(false);
    }
  }, [getPartialBlocks, setPartialBlocksList]);

  useEffect(() => {
    fetchPartialBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data: partialBlocksList, isLoading: loading, refetch: fetchPartialBlocks, error };
};
