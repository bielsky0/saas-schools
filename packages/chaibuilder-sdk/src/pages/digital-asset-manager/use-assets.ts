import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  thumbnailUrl?: string;
  description?: string;
  usedOn?: Array<{
    name: string;
    slug: string;
  }>;
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
}

export interface AssetsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const useAssets = (params: AssetsQueryParams = {}): UseQueryResult<AssetsResponse> => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  const { search, page = 1, limit = 30 } = params;

  return useQuery({
    queryKey: [ACTIONS.GET_ASSETS, search, page, limit],
    queryFn: async () => {
      const response: AssetsResponse = await fetchAPI(apiUrl, {
        action: ACTIONS.GET_ASSETS,
        data: {
          search,
          page,
          limit,
        },
      });
      response.page = page;
      response.limit = limit;
      return response as AssetsResponse;
    },
    staleTime: Infinity,
    retry: 1,
  });
};

export const useAsset = (id: string): UseQueryResult<Asset | null> => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  return useQuery({
    queryKey: [ACTIONS.GET_ASSET, id],
    queryFn: async () => {
      if (!id) return null;
      const response: Asset = await fetchAPI(apiUrl, {
        action: ACTIONS.GET_ASSET,
        data: { id },
      });

      return response as Asset;
    },
    staleTime: Infinity,
    retry: 1,
  });
};
