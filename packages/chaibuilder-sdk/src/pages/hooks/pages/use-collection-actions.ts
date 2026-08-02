import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { CmsCollectionVm, CmsTemplateVm } from "~/types/collections";

export type CollectionDraft = {
  key: string;
  name: string;
  pageType: string;
  templatePageType: string;
  templates?: CmsTemplateVm[];
};

export type TemplateDraft = {
  id: string;
  name: string;
  layout?: string;
};

const INVALIDATE_KEYS = [
  [ACTIONS.GET_COLLECTIONS],
  [ACTIONS.GET_WEBSITE_DATA],
  [ACTIONS.GET_PAGE_TYPES],
];

function invalidateCollections(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of INVALIDATE_KEYS) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/**
 * CRUD for tenant-managed CMS collections (blog-templates-cms F2.5).
 * Every mutation refreshes the collections/website/page-types caches.
 */
export const useCollectionActions = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();

  const createCollection = useMutation({
    mutationFn: async (collection: CollectionDraft) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.CREATE_COLLECTION,
        data: collection,
      });
      return response?.collection as CmsCollectionVm;
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Collection added");
    },
    onError: (error) => {
      toast.error("Failed to add collection", { description: error.message });
    },
  });

  const updateCollection = useMutation({
    mutationFn: async ({ collectionId, data }: { collectionId: string; data: Partial<CollectionDraft> }) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.UPDATE_COLLECTION,
        data: { collectionId, ...data },
      });
      return response?.collection as CmsCollectionVm;
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Collection updated");
    },
    onError: (error) => {
      toast.error("Failed to update collection", { description: error.message });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.DELETE_COLLECTION,
        data: { collectionId },
      });
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Collection deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete collection", { description: error.message });
    },
  });

  const addTemplate = useMutation({
    mutationFn: async ({ collectionId, template }: { collectionId: string; template: TemplateDraft }) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.CREATE_COLLECTION_TEMPLATE,
        data: { collectionId, template },
      });
      return response?.collection as CmsCollectionVm;
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Template added");
    },
    onError: (error) => {
      toast.error("Failed to add template", { description: error.message });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      collectionId,
      templateId,
      data,
    }: {
      collectionId: string;
      templateId: string;
      data: Partial<TemplateDraft>;
    }) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.UPDATE_COLLECTION_TEMPLATE,
        data: { collectionId, templateId, ...data },
      });
      return response?.collection as CmsCollectionVm;
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Template updated");
    },
    onError: (error) => {
      toast.error("Failed to update template", { description: error.message });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async ({ collectionId, templateId }: { collectionId: string; templateId: string }) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.DELETE_COLLECTION_TEMPLATE,
        data: { collectionId, templateId },
      });
    },
    onSuccess: () => {
      invalidateCollections(queryClient);
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete template", { description: error.message });
    },
  });

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
