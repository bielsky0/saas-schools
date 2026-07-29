import { get, noop } from "lodash-es";
import { useCallback } from "react";
import { useApiUrl, usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { fetchAPI } from "~/pages/utils/fetch-api";

export const useBuilderFetch = () => {
  const fetch = useFetch();
  const apiUrl = useApiUrl();
  return useCallback(
    async ({
      body,
      headers = {},
      url = apiUrl,
      streamResponse = false,
      signal,
    }: {
      body: { action: string; data?: any };
      headers?: Record<string, string>;
      url?: string;
      streamResponse?: boolean;
      signal?: AbortSignal;
    }) => {
      return fetch(url, body, headers, streamResponse, signal);
    },
    [fetch, apiUrl],
  );
};

export const useFetch = () => {
  const logout = usePagesProp("onLogout", noop);
  const getAccessToken = usePagesProp("getAccessToken");
  const apiUrl = useApiUrl();
  return useCallback(
    async (
      url: string = apiUrl,
      body: { action: string; data?: any },
      headers: Record<string, string> = {},
      streamResponse = false,
      signal?: AbortSignal,
    ) => {
      const authToken = await getAccessToken();
      try {
        const action = get(body, "action", "").toLowerCase();
        const response = await fetchAPI(
          url + (action ? `?action=${action}` : ""),
          body,
          {
            ...headers,
            Authorization: `Bearer ${authToken}`,
          },
          signal ? { signal } : undefined,
        );
        if (streamResponse) {
          return response;
        }

        if (response.status === 401) {
          console.log("401 Response", response);
          await logout("SESSION_EXPIRED");
          return null;
        }

        // Handle error responses
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`API Error (${response.status}):`, errorData);

          // Create an error object with all the details
          const error = {
            status: response.status,
            statusText: response.statusText,
            ...errorData,
            message: errorData.error || errorData.message || `Server error: ${response.status}`,
          };

          throw error;
        }

        return await response.json();
      } catch (error) {
        console.error("API request failed:", body, error);
        throw error; // Re-throw the error so it can be handled by the caller
      }
    },
    [logout, getAccessToken],
  );
};
