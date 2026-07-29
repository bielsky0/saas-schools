import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguages } from "~/hooks/use-languages";
import { useQuerySync } from "~/hooks/use-query-sync";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { useApiUrl } from "./use-builder-prop";

export const useUpdateWebsiteFields = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const { handleQuerySync } = useQuerySync();

  return useMutation({
    mutationFn: async (data: any) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.UPDATE_WEBSITE_FIELDS,
        data,
      });
    },
    onSuccess: (_, variables) => {
      handleQuerySync({
        type: "UPDATE_WEBSITE_DATA",
        data: variables,
        sync: true,
      });
    },
    onError: (response) => {
      toast.error(`Failed to update website settings`, {
        description: response.message,
      });
    },
  });
};

export const useUpdateAppSharedJsonLD = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();
  return useMutation({
    mutationFn: async (data: any) => {
      return fetchAPI(apiUrl, { action: ACTIONS.UPDATE_APP_SHARED_JSONLD, data: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_GLOBAL_JSONLD_ITEMS],
      });
      toast.success(`Shared JSON-LD updated successfully.`);
    },
    onError: (response) => {
      toast.error(`Failed to update shared JSON-LD`, {
        description: response.message,
      });
    },
  });
};

export const useAddGlobalSchema = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();
  const { selectedLang } = useLanguages();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      jsonld: object;
      addToExistingPages: boolean;
      addToNewPages: boolean;
      description: string;
      primaryPage?: string;
    }) => {
      return fetchAPI(apiUrl, { action: ACTIONS.ADD_GLOBAL_SCHEMA, data: { ...data, lang: selectedLang } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_GLOBAL_JSONLD_ITEMS],
      });
      toast.success(`Schema added successfully.`);
    },
    onError: (response) => {
      toast.error(`Failed to add schema`, {
        description: response.message,
      });
    },
  });
};

export const useUpdateGlobalSchema = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();
  const { selectedLang } = useLanguages();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      jsonld: object;
      addToNewPages: boolean;
      description: string;
    }) => {
      return fetchAPI(apiUrl, { action: ACTIONS.UPDATE_GLOBAL_SCHEMA, data: { ...data, lang: selectedLang } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_GLOBAL_JSONLD_ITEMS],
      });
      toast.success(`Schema updated successfully.`);
    },
    onError: (response) => {
      toast.error(`Failed to update schema`, {
        description: response.message,
      });
    },
  });
};

export const useDeleteGlobalSchema = () => {
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();
  const fetchAPI = useFetch();
  return useMutation({
    mutationFn: async (id: string) => {
      return fetchAPI(apiUrl, { action: ACTIONS.DELETE_GLOBAL_SCHEMA, data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_GLOBAL_JSONLD_ITEMS],
      });
      toast.success(`Schema deleted successfully.`);
    },
    onError: (response) => {
      toast.error(`Failed to delete schema`, {
        description: response.message,
      });
    },
  });
};

export const useTogglePageGlobalSchema = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useMutation({
    mutationFn: async (data: { schemaId: string; pageId: string; enabled: boolean }) => {
      return fetchAPI(apiUrl, { action: ACTIONS.TOGGLE_PAGE_GLOBAL_SCHEMA, data });
    },
    onError: (response) => {
      toast.error(`Failed to toggle schema`, {
        description: response.message,
      });
    },
  });
};

export const useApplySchemaToAllPages = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useMutation({
    mutationFn: async (schemaId: string) => {
      return fetchAPI(apiUrl, { action: ACTIONS.APPLY_SCHEMA_TO_ALL_PAGES, data: { schemaId } });
    },
    onSuccess: (response) => {
      toast.success(`Schema applied to ${response.count} page(s)`);
    },
    onError: (response) => {
      toast.error(`Failed to apply schema to all pages`, {
        description: response.message,
      });
    },
  });
};

export const useRemoveSchemaFromAllPages = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useMutation({
    mutationFn: async (schemaId: string) => {
      return fetchAPI(apiUrl, { action: ACTIONS.REMOVE_SCHEMA_FROM_ALL_PAGES, data: { schemaId } });
    },
    onSuccess: (response) => {
      toast.success(`Schema removed from ${response.count} page(s)`);
    },
    onError: (response) => {
      toast.error(`Failed to remove schema from all pages`, {
        description: response.message,
      });
    },
  });
};
