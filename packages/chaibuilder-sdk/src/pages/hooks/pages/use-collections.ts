import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { CmsCollectionVm } from "~/types/collections";

export const useCollections = () => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<CmsCollectionVm[]>({
    queryKey: [ACTIONS.GET_COLLECTIONS],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const data = await fetchApi(apiUrl, { action: ACTIONS.GET_COLLECTIONS });
      return data?.collections || [];
    },
    placeholderData: (prevData) => prevData || [],
  });
};
