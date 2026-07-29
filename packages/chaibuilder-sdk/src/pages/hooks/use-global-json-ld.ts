import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "./project/use-builder-prop";
import { useFetch } from "./utils/use-fetch";

export const useGlobalJsonLDItems = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useQuery({
    queryKey: [ACTIONS.GET_GLOBAL_JSONLD_ITEMS],
    queryFn: async () => {
      return fetchAPI(apiUrl, { action: ACTIONS.GET_GLOBAL_JSONLD_ITEMS });
    },
  });
};
