/**
 * Supabase Realtime Adapter
 *
 * Implementation of RealtimeAdapter for Supabase Realtime
 */

import type { RealtimeChannel, RealtimeClient } from "@supabase/supabase-js";
import type {
  CHANNEL_STATES,
  ChannelStatus,
  PresenceState,
  RealtimeAdapter,
  RealtimeChannelAdapter,
} from "./realtime-adapter";

/**
 * Supabase presence event configuration
 */
type SupabasePresenceEvent = "sync" | "join" | "leave";

/**
 * Wraps a Supabase RealtimeChannel to match the RealtimeChannelAdapter interface
 */
class SupabaseChannelAdapter implements RealtimeChannelAdapter {
  private channel: RealtimeChannel;

  constructor(channel: RealtimeChannel) {
    this.channel = channel;
  }

  get topic(): string {
    return this.channel.topic;
  }

  getState() {
    const channelState = this.channel.state;
    const SUPABASE_STATE_MAPPING = {
      closed: "CLOSED",
      errored: "ERROR",
      joined: "JOINED",
      joining: "JOINING",
      leaving: "LEAVING",
    };
    return (SUPABASE_STATE_MAPPING[channelState] || "CLOSED") as CHANNEL_STATES;
  }

  async subscribe(callback: (status: ChannelStatus) => void): Promise<void> {
    this.channel.subscribe((status: string) => {
      callback(status as ChannelStatus);
    });
  }

  unsubscribe(): void {
    this.channel.unsubscribe();
  }

  onBroadcast(event: string, callback: (payload: any) => void): void {
    this.channel.on("broadcast", { event }, callback);
  }

  onPresence(event: string, callback: () => void): void {
    // Supabase expects presence events in the format { event: 'sync' | 'join' | 'leave' }
    // TypeScript definitions for Supabase don't properly support presence events as of v2.90.1,
    // requiring the use of type assertion to access the presence event handlers.
    // This is a known limitation in Supabase's type definitions for RealtimeChannel.
    (this.channel as any).on("presence", { event: event as SupabasePresenceEvent }, callback);
  }

  async send(event: string, payload: any): Promise<void> {
    // Supabase expects the payload to be wrapped with event and type
    await this.channel.send({ event, payload, type: "broadcast" });
  }

  async track(state: any): Promise<void> {
    await this.channel.track(state);
  }

  untrack(): void {
    this.channel.untrack();
  }

  presenceState(): PresenceState {
    return this.channel.presenceState();
  }
}

/**
 * Supabase implementation of RealtimeAdapter
 */
export class SupabaseRealtimeAdapter implements RealtimeAdapter {
  private client: RealtimeClient;

  constructor(client: RealtimeClient) {
    this.client = client;
  }

  channel(channelId: string, options?: any): RealtimeChannelAdapter {
    const supabaseChannel = this.client.channel(channelId, options);
    return new SupabaseChannelAdapter(supabaseChannel);
  }
}
