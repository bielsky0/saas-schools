import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { useApiUrl } from "./use-builder-prop";

export interface LibraryGroup {
  id: string;
  name: string;
}

export const useLibraryGroups = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const queryClient = useQueryClient();

  // Fetch library groups
  const {
    data: groups = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["library-groups"],
    staleTime: "static",
    placeholderData: [],
    queryFn: async () => {
      try {
        const response = await fetchAPI(apiUrl, {
          action: "GET_LIBRARY_GROUPS",
        });
        return response || [];
      } catch (error) {
        console.error("Error fetching library groups:", error);
        return [];
      }
    },
  });

  // Create new group mutation
  const { mutateAsync: createGroup, isPending: isCreating } = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim()) {
        throw new Error("Group name is required");
      }

      return fetchAPI(apiUrl, {
        action: "CREATE_BLOCK_GROUP",
        data: { name },
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["library-groups"],
      });
      toast.success("Group created successfully");
    },
    onError: (error) => {
      console.error("Error creating group:", error);
      toast.error("Failed to create group", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return {
    groups,
    isLoading,
    error,
    createGroup,
    isCreating,
  };
};
