import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { TemplateConfig } from "~/types/collections";

export type UpdateTemplateInput = {
  templateId: string;
  collectionId: string;
  blocks?: unknown[];
  config?: TemplateConfig;
};

/**
 * Persist a collection layout template — blocks and/or layout config
 * (UPDATE_TEMPLATE, blog-templates-cms F4). The backend upserts the lazily-created
 * template page. On success we refresh the template data cache and the collection
 * list (post counts may shift). `mutateAsync` is used by the save pipeline so the
 * caller can await the result and reflect save state correctly.
 */
export const useUpdateTemplate = () => {
  const fetchAPI = useFetch();
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, collectionId, blocks, config }: UpdateTemplateInput) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.UPDATE_TEMPLATE,
        data: { templateId, collectionId, blocks, config },
      });
      if (response?.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: (_response, { templateId, collectionId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_TEMPLATE_DATA, templateId, collectionId] });
      queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_COLLECTIONS] });
    },
    onError: (error) => {
      toast.error("Failed to save template", { description: error.message });
    },
  });
};
