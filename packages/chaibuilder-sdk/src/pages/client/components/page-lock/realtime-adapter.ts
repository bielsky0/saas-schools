/**
 * Realtime Adapter Interface
 *
 * This interface abstracts the realtime functionality to support multiple
 * realtime service providers (Supabase, Pusher, Ably, etc.)
 */

/**
 * Represents the status of a channel subscription
 */
export type ChannelStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

export type CHANNEL_STATES = "JOINED" | "LEFT" | "ERROR" | "CLOSED" | "JOINING" | "LEAVING";

/**
 * Generic event payload structure
 */
export interface RealtimeEventPayload {
  event: string;
  payload: any;
  type: "broadcast" | "presence";
}

/**
 * Presence state structure
 */
export interface PresenceState {
  [key: string]: any[];
}

/**
 * Channel interface that wraps provider-specific channel implementations
 */
export interface RealtimeChannelAdapter {
  /**
   * The topic/name of the channel
   */
  topic: string;

  /**
   * The state of the channel
   */
  getState(): CHANNEL_STATES;

  /**
   * Subscribe to the channel
   * @param callback - Called when subscription status changes
   * @returns Promise that resolves when subscription is complete
   */
  subscribe(callback: (status: ChannelStatus) => void): Promise<void>;

  /**
   * Unsubscribe from the channel
   */
  unsubscribe(): void;

  /**
   * Listen for broadcast events
   * @param event - Event name to listen for
   * @param callback - Function to call when event is received
   */
  onBroadcast(event: string, callback: (payload: any) => void): void;

  /**
   * Listen for presence events (sync, join, leave)
   * @param event - Presence event type
   * @param callback - Function to call when event occurs
   */
  onPresence(event: string, callback: () => void): void;

  /**
   * Send a broadcast message to the channel
   * @param event - Event name
   * @param payload - Data to send
   */
  send(event: string, payload: any): Promise<void>;

  /**
   * Track presence in the channel
   * @param state - Presence state to track
   */
  track(state: any): Promise<void>;

  /**
   * Stop tracking presence in the channel
   */
  untrack(): void;

  /**
   * Get the current presence state
   * @returns Current presence state
   */
  presenceState(): PresenceState;
}

/**
 * Main realtime adapter interface for creating channels
 */
export interface RealtimeAdapter {
  /**
   * Create or get a channel
   * @param channelId - Unique identifier for the channel
   * @param options - Provider-specific channel options
   * @returns Channel adapter instance
   */
  channel(channelId: string, options?: any): RealtimeChannelAdapter;
}
