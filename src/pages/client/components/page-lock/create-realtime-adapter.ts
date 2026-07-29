/**
 * Backward Compatibility Helper
 * 
 * Provides automatic wrapping of Supabase RealtimeClient for easy migration
 */

import type { RealtimeClient } from "@supabase/supabase-js";
import { SupabaseRealtimeAdapter } from "./supabase-realtime-adapter";

/**
 * Creates a RealtimeAdapter from a Supabase RealtimeClient
 * 
 * This is a convenience function for users migrating from the old API
 * where they passed the websocket/RealtimeClient directly.
 * 
 * @param websocket - Supabase RealtimeClient instance
 * @returns RealtimeAdapter that wraps the Supabase client
 * 
 * @example
 * ```tsx
 * import { createClient } from '@supabase/supabase-js';
 * import { createRealtimeAdapter } from '@chaibuilder/sdk/pages';
 * 
 * const supabase = createClient(url, key);
 * const realtimeAdapter = createRealtimeAdapter(supabase.realtime);
 * 
 * // Pass to ChaiWebsiteBuilder
 * <ChaiWebsiteBuilder
 *   {...props}
 *   realtimeAdapter={realtimeAdapter}
 * />
 * ```
 */
export function createRealtimeAdapter(websocket: RealtimeClient) {
  return new SupabaseRealtimeAdapter(websocket);
}
