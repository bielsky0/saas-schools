import { useCallback } from "react";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useAiContext } from "~/pages/hooks/ai/use-ai-context";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { ChaiBlock } from "~/types/common";

export const useAskAi = () => {
  const apiUrl = useApiUrl();
  const { aiContext } = useAiContext();
  const fetchAPI = useFetch();
  return useCallback(
    async (type: "styles" | "content", prompt: string, blocks: ChaiBlock[], lang: string) => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.ASK_AI,
        data: { type, prompt, blocks, context: aiContext, lang },
      });
    },
    [apiUrl, aiContext, fetchAPI],
  );
};
