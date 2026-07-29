import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { useApiUrl } from "./use-builder-prop";

export interface Library {
  id: string;
  name: string;
  description?: string;
  type: string;
}

export const useLibraries = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  return useQuery({
    queryKey: [ACTIONS.GET_LIBRARIES],
    staleTime: "static",
    queryFn: async () => {
      const data = await fetchAPI(apiUrl, { action: ACTIONS.GET_LIBRARIES });
      return data || [];
    },
  });
};

export const useLibraryItems = (libraryId: string) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useQuery({
    queryKey: [ACTIONS.GET_LIBRARY_ITEMS, libraryId],
    staleTime: "static",
    placeholderData: [],
    queryFn: async () => {
      if (!libraryId) return [];
      return fetchAPI(apiUrl, {
        action: ACTIONS.GET_LIBRARY_ITEMS,
        data: { id: libraryId },
      });
    },
    enabled: !!libraryId,
  });
};

export const useLibraryItem = (itemId: string) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useQuery({
    queryKey: [ACTIONS.GET_LIBRARY_ITEM, itemId],
    staleTime: "static",
    placeholderData: {},
    queryFn: async () => {
      if (!itemId) return {};
      return fetchAPI(apiUrl, {
        action: ACTIONS.GET_LIBRARY_ITEM,
        data: { itemId },
      });
    },
    enabled: !!itemId,
  });
};
