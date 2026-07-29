import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuerySync } from "~/hooks/use-query-sync";
import { useSavePage } from "~/hooks/use-save-page";
import { useRealtimeAdapter } from "~/pages/hooks/project/use-builder-prop";
import { useChaiAuth } from "~/pages/hooks/use-chai-auth";
import {
  BROADCAST_EVENTS,
  EVENT,
  PAGE_STATUS,
  PRESENCE_EVENTS,
  getMinOnlineAt,
  getPageToUser,
  pageLockMetaAtom,
  pageStatusAtom,
  pageUserMapAtom,
  realtimeChannel,
  useChannelId,
  usePageId,
  useUserId,
} from "./page-lock-utils";
import type { RealtimeChannelAdapter } from "./realtime-adapter";

const clientId: string = (() => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
})();
let websocketTimeout: any = null;

// Reconnection configuration constants
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_DELAY_MS = 16000;

/**
 * @returns
 * { pageId: { pageId: string; userId: string; clientId: string; onlineAt: number }}
 */
export const usePageToUser = () => {
  const [pageToUser, setPageToUser] = useAtom(pageUserMapAtom);
  return { pageToUser, setPageToUser };
};

/**
 * @returns
 * { pageStatus: string, setPageStatus: (pageStatus: string) => void }
 */
export const usePageLockStatus = () => {
  const [pageStatus, setPageStatus] = useAtom(pageStatusAtom);
  const isLocked = [PAGE_STATUS.LOCKED, PAGE_STATUS.ACTIVE_IN_ANOTHER_TAB].includes(pageStatus as any);
  const isEditing = [PAGE_STATUS.EDITING].includes(pageStatus as any);
  return { pageStatus, setPageStatus, isLocked, isEditing };
};

export const usePageLockMeta = () => {
  const [pageLockMeta, setPageLockMeta] = useAtom(pageLockMetaAtom);
  return { pageLockMeta, setPageLockMeta };
};

/**
 * @returns
 * { pageOwner: { pageId: string; userId: string; clientId: string; onlineAt: number }}
 */
export const useCurrentPageOwner = () => {
  const pageId = usePageId();
  const { pageToUser } = usePageToUser();
  return useMemo(() => pageToUser[pageId], [pageToUser, pageId]);
};

/**
 * @returns
 * null | RealtimeChannelAdapter
 */
const useRealtimeChannel = (): null | RealtimeChannelAdapter => {
  const realtimeAdapter = useRealtimeAdapter();
  const { setPageStatus } = usePageLockStatus();
  const [channel] = useAtom(realtimeChannel);

  // * Checking if `realtimeAdapter` instance is not provided
  useEffect(() => {
    clearTimeout(websocketTimeout);
    if (realtimeAdapter) return;
    websocketTimeout = setTimeout(() => {
      if (!realtimeAdapter) setPageStatus(PAGE_STATUS.EDITING);
    }, 500);
    return () => clearTimeout(websocketTimeout);
  }, [realtimeAdapter, setPageStatus]);

  return channel;
};

/**
 *
 * @description
 * Update online users in the page
 */
export const useUpdateOnlineUsers = () => {
  const pageId = usePageId();
  const userId = useUserId();
  const channel = useRealtimeChannel();
  const { setPageToUser } = usePageToUser();
  const { setPageStatus, pageStatus } = usePageLockStatus();
  const pageRef = useRef<any>(pageId);

  useEffect(() => {
    pageRef.current = pageId;
  }, [pageId]);

  return useCallback(
    (channelOverride?: RealtimeChannelAdapter) => {
      const targetChannel = channelOverride || channel;
      if (!targetChannel) return [];
      const stateOfPresence = targetChannel?.presenceState();
      const pageToUser = getPageToUser(stateOfPresence);
      setPageToUser(pageToUser);
      const pageOwner = pageToUser[pageRef.current];

      if (!pageOwner) {
        setPageStatus(PAGE_STATUS.CHECKING);
      } else if (!userId) {
        setPageStatus(PAGE_STATUS.CHECKING);
      } else if (pageOwner.userId === userId && pageOwner.clientId === clientId) {
        if (pageStatus === PAGE_STATUS.TAKE_OVER_REQUESTED) {
          return;
        }
        setPageStatus(PAGE_STATUS.EDITING);
      } else if (pageOwner.userId === userId && pageOwner.clientId !== clientId) {
        setPageStatus(PAGE_STATUS.ACTIVE_IN_ANOTHER_TAB);
      } else {
        setPageStatus(PAGE_STATUS.LOCKED);
      }
    },
    [channel, setPageToUser, setPageStatus, userId, pageStatus],
  );
};

/**
 *
 * @description
 * Send realtime event to the channel
 */
export const useSendRealtimeEvent = () => {
  const userId = useUserId();
  const pageId = usePageId();
  const channel = useRealtimeChannel();
  const pageOwner = useCurrentPageOwner();
  const { setPageLockMeta } = usePageLockMeta();
  const { user: chaiUser } = useChaiAuth();
  const pageRef = useRef<any>(pageId);

  useEffect(() => {
    pageRef.current = pageId;
  }, [pageId]);

  return useCallback(
    async (event: string, _payload?: any) => {
      if (!channel) return;
      const payload = _payload || {};
      payload.userId = userId;
      payload.userName = chaiUser?.name || chaiUser?.email || "Unknown user";
      payload.pageId = pageRef.current;
      payload.senderClientId = clientId;
      payload.receiverClientId = _payload?.requestingClientId || pageOwner?.clientId;
      await channel.send(event, payload);
      setPageLockMeta({});
    },
    [channel, userId, pageOwner, setPageLockMeta, chaiUser],
  );
};

/**
 *
 * @description
 * Receive realtime event from the channel
 */
export const useReceiveRealtimeEvent = () => {
  const userId = useUserId();
  const pageId = usePageId();
  const channel = useRealtimeChannel();
  const { setPageStatus } = usePageLockStatus();
  const { setPageLockMeta } = usePageLockMeta();
  const sendEvent = useSendRealtimeEvent();
  const pageRef = useRef<any>(pageId);
  const { savePageAsync } = useSavePage();
  const { handleQuerySync } = useQuerySync();

  useEffect(() => {
    pageRef.current = pageId;
  }, [pageId]);

  return useCallback(
    (event: string) =>
      async ({ payload: _payload }: any) => {
        const payload = _payload || {};
        // Handle query sync events (these don't need pageId/clientId validation)
        if (
          event === EVENT.UPDATE_WEBSITE_DATA ||
          event === EVENT.UPDATE_PAGE_DATA ||
          event === EVENT.PUBLISH_CHANGES ||
          event === EVENT.UNPUBLISH_PAGE
        ) {
          handleQuerySync({
            type: event,
            data: payload?.data,
            sync: false,
            userName: payload?.userName,
          });
          return;
        }
        if (!payload?.pageId || payload?.pageId !== pageRef.current || payload?.receiverClientId !== clientId) return;
        setPageLockMeta({});

        switch (event) {
          case EVENT.FORCE_TAKE_OVER_REQUEST:
          case EVENT.CONTINUE_EDITING_IN_THIS_TAB_REQUEST: {
            try {
              await savePageAsync(true);
            } catch (error) {
              console.error("Failed to save page before releasing lock:", error);
            }
            await sendEvent(EVENT.CONTINUE_EDITING_IN_THIS_CLIENT, { requestingClientId: payload?.senderClientId });
            setTimeout(() => setPageLockMeta({ type: event }), 0);
            break;
          }
          case EVENT.TAKE_OVER_REQUEST: {
            setPageLockMeta({ requestingUserId: payload?.userId, requestingClientId: payload?.senderClientId });
            setPageStatus(PAGE_STATUS.TAKE_OVER_REQUESTED);
            break;
          }
          case EVENT.CONTINUE_EDITING_IN_THIS_CLIENT: {
            const onlineAt = getMinOnlineAt(channel?.presenceState());
            setPageStatus(PAGE_STATUS.CHECKING);
            await channel?.track({ onlineAt, pageId: pageRef.current, userId, clientId });
            break;
          }
          case EVENT.TAKE_OVER_REJECTED: {
            setPageLockMeta({ type: EVENT.TAKE_OVER_REJECTED });
            break;
          }
          default:
            break;
        }
      },
    [sendEvent, setPageLockMeta, setPageStatus, channel, userId, savePageAsync, handleQuerySync],
  );
};

/**
 *
 *
 * @description
 * Subscribe to realtime events
 */
export const useChaibuilderRealtime = () => {
  const realtimeAdapter = useRealtimeAdapter();
  const userId = useUserId();
  const pageId = usePageId();
  const channelId = useChannelId();
  const [channel, setChannel] = useAtom(realtimeChannel) as [
    RealtimeChannelAdapter | null,
    (value: RealtimeChannelAdapter | null) => void,
  ];

  const onReceiveEvent = useReceiveRealtimeEvent();
  const updateOnlineUsers = useUpdateOnlineUsers();

  // Refs for stable callbacks and reconnection state
  const onReceiveEventRef = useRef(onReceiveEvent);
  const updateOnlineUsersRef = useRef(updateOnlineUsers);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const channelRef = useRef(channel);
  const reconnectChannelRef = useRef<() => void>(() => {});

  useEffect(() => {
    onReceiveEventRef.current = onReceiveEvent;
    updateOnlineUsersRef.current = updateOnlineUsers;
    channelRef.current = channel;
  }, [onReceiveEvent, updateOnlineUsers, channel]);

  // Common function to setup channel with event listeners
  const setupChannelListeners = useCallback((newChannel: RealtimeChannelAdapter) => {
    // Attach broadcast listeners
    BROADCAST_EVENTS.forEach((event: string) => {
      newChannel.onBroadcast(event, (payload: any) => {
        onReceiveEventRef.current(event)(payload);
      });
    });

    // Attach presence listeners
    PRESENCE_EVENTS.forEach((event: string) => {
      newChannel.onPresence(event, () => {
        updateOnlineUsersRef.current(newChannel);
      });
    });
  }, []);

  // Function to cleanup and reconnect the channel
  const reconnectChannel = useCallback(() => {
    if (isReconnectingRef.current || !realtimeAdapter || !userId || !channelId) return;

    // Check if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping reconnection attempts.`,
      );
      return;
    }

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;

    console.log(
      `Attempting to reconnect realtime channel (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
    );

    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Remove old channel if it exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      setChannel(null);
      channelRef.current = null;
    }

    // Exponential backoff delay calculation
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, reconnectAttemptsRef.current - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      const newChannel = realtimeAdapter.channel(channelId, {
        config: { presence: { key: clientId } },
      });

      // Setup event listeners
      setupChannelListeners(newChannel);

      newChannel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime connection established successfully");
          setChannel(newChannel);
          channelRef.current = newChannel;
          reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
          isReconnectingRef.current = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.log(
            `Realtime connection failed: ${status}. Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`,
          );
          // Only trigger another reconnection attempt if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            // Keep isReconnectingRef true and schedule next attempt with delay
            setTimeout(() => {
              isReconnectingRef.current = false;
              reconnectChannelRef.current();
            }, 500); // Small delay before triggering next attempt
          } else {
            console.error("Maximum reconnection attempts reached");
            isReconnectingRef.current = false;
          }
        } else if (status === "CLOSED") {
          console.log("Realtime connection closed");
          isReconnectingRef.current = false;
        }
      });
    }, delay);
  }, [realtimeAdapter, userId, channelId, setChannel, setupChannelListeners]);

  // Keep the ref updated with the latest reconnectChannel function
  useEffect(() => {
    reconnectChannelRef.current = reconnectChannel;
  }, [reconnectChannel]);

  // Connection Effect
  useEffect(() => {
    if (!realtimeAdapter || !userId || !channelId) return;
    if (channel && channel.topic === channelId) return;

    // Reset reconnection attempts when starting a new connection
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;

    const newChannel = realtimeAdapter.channel(channelId, {
      config: { presence: { key: clientId } },
    });

    // Setup event listeners using shared function
    setupChannelListeners(newChannel);

    newChannel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        console.log("Realtime connection established successfully");
        setChannel(newChannel);
        channelRef.current = newChannel;
        reconnectAttemptsRef.current = 0;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.log(`Realtime connection failed: ${status}. Will attempt to reconnect...`);
        // Only trigger reconnection if not already reconnecting
        if (!isReconnectingRef.current) {
          reconnectChannel();
        }
      } else if (status === "CLOSED") {
        console.log("Realtime connection closed");
      }
    });

    return () => {
      // Cleanup: clear timeouts and reset state
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      isReconnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      // Clear shared channel references if they point to this channel
      if (channelRef.current === newChannel) {
        channelRef.current = null;
      }
      setChannel(null);
      newChannel.unsubscribe();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeAdapter, userId, channelId, setChannel, reconnectChannel, setupChannelListeners]);

  // Handle browser tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, checking realtime connection...");

        // Check if required dependencies are available
        if (!realtimeAdapter || !userId || !channelId) {
          console.log("Required dependencies not available, skipping reconnection");
          return;
        }

        // Don't attempt reconnection if already reconnecting
        if (isReconnectingRef.current) {
          console.log("Reconnection already in progress, skipping visibility change reconnect");
          return;
        }

        // Check if channel exists and get its state
        if (channelRef.current) {
          // For adapters, we check if the channel is properly subscribed by checking its topic
          // If topic exists, the channel should be active
          const channelState = channelRef.current.getState();
          const isNotJoined = channelState !== "JOINED";

          // If channel is not active or doesn't match current channelId, reconnect
          if (isNotJoined) {
            console.log("Channel is not active, reconnecting...");
            reconnectChannel();
          }
        } else {
          // No channel exists, trigger reconnection
          console.log("No active channel found, reconnecting...");
          reconnectChannel();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [realtimeAdapter, userId, channelId, reconnectChannel]);

  // Tracking Effect
  useEffect(() => {
    if (channel && pageId && userId) {
      channel.track({
        pageId: pageId,
        userId: userId,
        clientId: clientId,
        onlineAt: +new Date(),
      });
    }

    return () => {
      if (channel && pageId) {
        channel.untrack();
      }
    };
  }, [channel, pageId, userId]);

  return void 0;
};
