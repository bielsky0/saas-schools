import { useMutation } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "./use-fetch";

export type ChangePasswordPayload = {
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const useChangePassword = () => {
  const apiURL = useApiUrl();
  const fetchAPI = useFetch();

  return useMutation({
    mutationKey: [ACTIONS.CHANGE_PASSWORD],
    mutationFn: async (payload: ChangePasswordPayload) => {
      const response = await fetchAPI(apiURL, {
        action: ACTIONS.CHANGE_PASSWORD,
        data: payload,
      });

      return response?.data as { message: string };
    },
  });
};
