import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";

export type EnrollmentTypeItem = {
  id: string;
  name: string;
};

/**
 * List the tenant's group types (GET_ENROLLMENT_TYPES_LIST, mvp-plan F2) for
 * the enrollment template editor's "group type preview" dropdown — the
 * enrollment counterpart of `useCollectionItems` for the blog template.
 */
export const useEnrollmentTypes = () => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<EnrollmentTypeItem[]>({
    queryKey: [ACTIONS.GET_ENROLLMENT_TYPES_LIST],
    enabled: true,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const data = await fetchApi(apiUrl, {
        action: ACTIONS.GET_ENROLLMENT_TYPES_LIST,
        data: {},
      });
      return data?.types ?? [];
    },
    placeholderData: (prevData) => prevData || [],
  });
};