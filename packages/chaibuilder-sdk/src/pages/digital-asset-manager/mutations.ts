import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";

export const useUploadAsset = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();

  return useMutation({
    mutationFn: async (
      assets: Array<{
        file: Base64URLString;
        folderId?: string;
        name: string;
        optimize?: boolean;
      }>,
    ) => {
      const promises = assets.map(async (asset) => {
        return fetchAPI(apiUrl, {
          action: ACTIONS.UPLOAD_ASSET,
          data: asset,
        });
      });
      const responses = await Promise.all(promises);
      return responses;
    },
    onSuccess: (response) => {
      if (response?.some((res) => res.error)) {
        throw new Error(response?.find((res) => res.error)?.error || "Failed to upload asset");
      } else {
        queryClient.invalidateQueries({
          queryKey: [ACTIONS.GET_ASSETS],
        });
        const count = response?.length;
        toast.success(`${count === 1 ? "Asset" : count + " Assets"} uploaded successfully`);
      }
    },
    onError: () => {
      toast.error("Failed to upload asset");
    },
  });
};

export const useDeleteAsset = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.DELETE_ASSET,
        data: { id: assetId },
      });
    },
    onSuccess: (response) => {
      if (response?.error) {
        throw new Error(response?.error);
      } else {
        queryClient.invalidateQueries({
          queryKey: [ACTIONS.GET_ASSETS],
        });
        toast.success("Asset deleted successfully");
      }
    },
    onError: () => {
      toast.error("Failed to delete asset");
    },
  });
};

export const useUpdateAsset = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();

  return useMutation({
    mutationFn: async (updatedAsset: { id: string; file?: string; description?: string }) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.UPDATE_ASSET,
        data: updatedAsset,
      });
    },
    onSuccess: (response) => {
      if (response?.error) {
        throw new Error(response?.error);
      } else {
        queryClient.invalidateQueries({
          queryKey: [ACTIONS.GET_ASSETS],
        });
        if (response?.id) {
          queryClient.invalidateQueries({
            queryKey: [ACTIONS.GET_ASSET, response.id],
          });
        }
        toast.success("Asset updated successfully");
      }
    },
    onError: () => {
      toast.error("Failed to update asset");
    },
  });
};
