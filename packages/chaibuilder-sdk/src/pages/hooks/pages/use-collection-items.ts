import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { CmsCollectionItemVm } from "~/types/collections";

/**
 * List items of a CMS collection (LIST_COLLECTION_ITEMS, blog-templates-cms F3).
 * Used by the template editor's "post preview" dropdown (F5.3) to offer the
 * tenant's blog posts as the sample data rendered on the canvas.
 */
export const useCollectionItems = (collectionId?: string) => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<CmsCollectionItemVm[]>({
    queryKey: [ACTIONS.LIST_COLLECTION_ITEMS, collectionId],
    enabled: Boolean(collectionId),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const data = await fetchApi(apiUrl, {
        action: ACTIONS.LIST_COLLECTION_ITEMS,
        data: { collectionId },
      });
      return data?.items || [];
    },
    placeholderData: (prevData) => prevData || [],
  });
};
