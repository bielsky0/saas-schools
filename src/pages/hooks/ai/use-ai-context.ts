import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const useAiContext = () => {
  const queryClient = useQueryClient();

  const { data: aiContext } = useQuery<string>({
    queryKey: [ACTIONS.AI_CONTEXT],
    initialData: "",
    queryFn: () => "",
    staleTime: 0,
  });

  const setAiContext = useCallback(
    (aiContext: string) => {
      queryClient.setQueryData([ACTIONS.AI_CONTEXT], aiContext);
    },
    [queryClient],
  );

  return { setAiContext, aiContext };
};
