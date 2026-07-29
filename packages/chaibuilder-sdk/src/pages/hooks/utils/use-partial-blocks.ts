import { filter, has, isEmpty, startCase } from "lodash-es";
import { useCallback } from "react";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { ChaiBlock } from "~/types/common";
import { useFetch } from "./use-fetch";

export const usePartialBlocksFn = (): {
  getPartialBlocks: () => Promise<Record<string, { name: string; description?: string; type: string }>>;
  getPartialBlockBlocks: (partialBlockKey: string) => Promise<ChaiBlock[]>;
} => {
  const { data: projectPages } = useWebsitePrimaryPages();
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return {
    getPartialBlocks: useCallback(async () => {
      const partialBlocks: Record<string, { name: string; description?: string; type: string }> = {};
      for (const page of projectPages ?? []) {
        if (isEmpty(page?.slug)) {
          partialBlocks[page.id as string] = {
            type: page.pageType,
            name: startCase(page.name ?? page.slug),
            description: "",
          };
        }
      }
      return partialBlocks;
    }, [projectPages]),
    getPartialBlockBlocks: useCallback(
      async (partialBlockKey: string) => {
        if (!partialBlockKey) return [];
        try {
          const data = await fetchAPI(apiUrl, {
            action: "GET_DRAFT_PAGE",
            data: { id: partialBlockKey, draft: true, editor: false, mergePartials: true },
          });
          return filter(data.blocks, (block: ChaiBlock) => has(block, "_id"));
        } catch (error) {
          console.error(error);
          return [];
        }
      },
      [fetchAPI, apiUrl],
    ),
  };
};
