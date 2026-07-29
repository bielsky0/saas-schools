export const fetchAPI = async (
  apiUrl: string,
  body: { action: string; data?: any },
  headers: Record<string, string> = {},
  options?: { signal?: AbortSignal },
) => {
  return await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
};
