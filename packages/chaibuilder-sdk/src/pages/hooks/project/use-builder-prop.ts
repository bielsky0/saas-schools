import { get } from "lodash-es";
import { useMemo } from "react";
import type { RealtimeAdapter } from "~/pages/client/components/page-lock/realtime-adapter";
import { usePagesProps } from "~/pages/hooks/utils/use-pages-props";

export const usePagesProp = <T>(key: string, defaultValue?: T) => {
  const [pagesProps] = usePagesProps();
  return useMemo(() => get(pagesProps, key, defaultValue), [pagesProps, key, defaultValue]);
};

export const useApiUrl = () => {
  return usePagesProp("apiUrl", "/chai/api") as string;
};

/**
 * @deprecated Use useRealtimeAdapter instead. This will be removed in future versions.
 * @returns Supabase RealtimeClient or null
 */
export const useWebsocket = () => {
  // Using any because this is a legacy API that accepts Supabase RealtimeClient
  // which is not imported here to avoid hard dependency
  return usePagesProp("websocket", null) as any | null;
};

/**
 * Get the realtime adapter for page lock functionality.
 *
 * Users must create and pass their own adapter instance (e.g., SupabaseRealtimeAdapter).
 *
 * @returns RealtimeAdapter instance or null
 */
export const useRealtimeAdapter = (): RealtimeAdapter | null => {
  return usePagesProp("realtimeAdapter", null) as RealtimeAdapter | null;
};
