import { useCallback } from "react";
import { useAccessToken } from "~/pages/hooks/use-access-token";
import { useChaiAuth } from "~/pages/hooks/use-chai-auth";

export const useChaiFetch = () => {
  const { logout } = useChaiAuth();
  const { getAccessToken } = useAccessToken();
  return useCallback(
    async ({
      url,
      method = "GET",
      body = {},
      headers = {},
    }: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      url: string;
      body?: any;
      headers?: Record<string, string>;
    }) => {
      const authToken = await getAccessToken();
      if (!url) {
        throw new Error("URL is required");
      }
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            ...headers,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 401) {
          console.log("Session expired", response);
          await logout();
          window.location.reload();
          return null;
        }

        if (response.status === 400) {
          throw new Error((await response.json()).error);
        }

        return await response.json();
      } catch (error) {
        console.log("Something went wrong", error);
        throw error;
      }
    },
    [logout, getAccessToken],
  );
};
