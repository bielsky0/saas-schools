import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { TemplateDataVm } from "~/types/collections";

/**
 * Fetch a collection layout template: the lazily-created template page (blocks)
 * plus its layout config (GET_TEMPLATE_DATA, blog-templates-cms F4).
 * Template data changes rarely outside the editing session, so staleTime is
 * Infinity and the cache is invalidated manually after UPDATE_TEMPLATE.
 */
export const useTemplateData = (templateId?: string, collectionId?: string) => {
  const fetchAPI = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<TemplateDataVm | undefined>({
    queryKey: [ACTIONS.GET_TEMPLATE_DATA, templateId, collectionId],
    enabled: Boolean(templateId) && Boolean(collectionId),
    staleTime: Infinity,
    queryFn: async () => {
      const data = await fetchAPI(apiUrl, {
        action: ACTIONS.GET_TEMPLATE_DATA,
        data: { templateId, collectionId },
      });
      return data;
    },
  });
};
