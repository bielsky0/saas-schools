import { useMutation, useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { libraryBlocksAtom } from "~/hooks/use-library-blocks";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { ChaiBlock } from "~/types/common";
import { useApiUrl } from "./use-builder-prop";

// Hook for saving a UI block to the library
export const useSaveUIBlock = (onSuccess?: (response: any) => void) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      group: string;
      blocks: ChaiBlock[];
      description: string;
      previewImage?: string;
      id?: string; // Optional ID for updates
    }) => {
      // Always use UPSERT_LIBRARY_ITEM action whether creating or updating
      return fetchAPI(apiUrl, {
        action: ACTIONS.UPSERT_LIBRARY_ITEM,
        data,
      });
    },
    onSuccess: (response) => {
      if (onSuccess) {
        onSuccess(response);
      } else {
        toast.success("Block saved successfully");
      }
    },
    onError: (error) => {
      console.error("Error saving block:", error);
      toast.error("Failed to save block", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

// Hook for fetching a UI block details
export const useGetUIBlockDetails = (blockId?: string) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  return useQuery({
    staleTime: "static",
    queryKey: [ACTIONS.GET_LIBRARY_ITEM, blockId],
    enabled: !!blockId, // Only run query if blockId is provided
    queryFn: async () => {
      if (!blockId) return null;

      try {
        const response = await fetchAPI(apiUrl, {
          action: ACTIONS.GET_LIBRARY_ITEM,
          data: { id: blockId },
        });

        return response;
      } catch (error) {
        console.error(error);
        // Throw the error so it's caught by the error boundary
        throw new Error("The block could not be found on the server. It may have been deleted.");
      }
    },
    retry: false,
  });
};

// Hook for uploading a preview image for a UI block
export const useUploadBlockPreview = (onSuccess?: () => void) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();

  return useMutation({
    mutationFn: async (data: { blockId: string; previewImage: string }) => {
      return fetchAPI(apiUrl, {
        action: "UPLOAD_BLOCK_PREVIEW",
        data,
      });
    },
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      } else {
        toast.success("Preview image uploaded successfully");
      }
    },
    onError: (error) => {
      console.error("Error uploading preview image:", error);
      toast.error("Preview image upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

// Hook for deleting a UI block
export const useDeleteUIBlock = (onSuccess?: () => void) => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const setLibraryBlocks = useSetAtom(libraryBlocksAtom);

  return useMutation({
    mutationFn: async (blockId: string) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.DELETE_LIBRARY_ITEM,
        data: { id: blockId },
      });
    },
    onSuccess: () => {
      // Reset all library caches to force refetch
      setLibraryBlocks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((libraryId) => {
          updated[libraryId] = { loading: "idle", blocks: [], error: false };
        });
        return updated;
      });

      if (onSuccess) {
        onSuccess();
      } else {
        toast.success("Block deleted successfully");
      }
    },
    onError: (error) => {
      console.error("Error deleting block:", error);
      toast.error("Failed to delete block", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};
