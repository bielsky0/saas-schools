import { useQuery } from "@tanstack/react-query";
import { EnrollmentPreview } from "~/hooks/use-enrollment-preview";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";

/**
 * Fetch the full enrollment preview of a single group type
 * (GET_ENROLLMENT_PREVIEW, mvp-plan F2). The result is pushed into
 * `enrollmentPreviewAtom` by the template editor's right panel so the
 * dedicated enrollment blocks render real group-type data on the canvas.
 */
export const useEnrollmentPreviewData = (groupId?: string) => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<EnrollmentPreview | null>({
    queryKey: [ACTIONS.GET_ENROLLMENT_PREVIEW, groupId],
    enabled: Boolean(groupId),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const data = await fetchApi(apiUrl, {
        action: ACTIONS.GET_ENROLLMENT_PREVIEW,
        data: { groupId },
      });
      return data?.preview ?? null;
    },
  });
};