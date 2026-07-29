import { atom } from "jotai";
import { first, groupBy, minBy, values } from "lodash-es";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useWebsiteSetting } from "~/pages/hooks/project/use-website-settings";
import { useChaiAuth } from "~/pages/hooks/use-chai-auth";
import type { RealtimeChannelAdapter } from "./realtime-adapter";

export type ChaiOnlineUser = { pageId: string; userId: string; clientId: string; onlineAt: number };

export const PAGE_STATUS = {
  LOCKED: "LOCKED",
  EDITING: "EDITING",
  CHECKING: "CHECKING",
  TAKE_OVER_REQUESTED: "TAKE_OVER_REQUESTED",
  ACTIVE_IN_ANOTHER_TAB: "ACTIVE_IN_ANOTHER_TAB",
  FORCE_TAKE_OVER: "FORCE_TAKE_OVER",
  CONNECTION_LOST: "CONNECTION_LOST",
} as const;

export const EVENT = {
  FORCE_TAKE_OVER: "FORCE_TAKE_OVER",
  TAKE_OVER_REQUEST: "TAKE_OVER_REQUEST",
  TAKE_OVER_APPROVED: "TAKE_OVER_APPROVED",
  TAKE_OVER_REJECTED: "TAKE_OVER_REJECTED",
  FORCE_TAKE_OVER_REQUEST: "FORCE_TAKE_OVER_REQUEST",
  CONTINUE_EDITING_IN_THIS_CLIENT: "CONTINUE_EDITING_IN_THIS_CLIENT",
  CONTINUE_EDITING_IN_THIS_TAB_REQUEST: "CONTINUE_EDITING_IN_THIS_TAB_REQUEST",
  UPDATE_WEBSITE_DATA: "UPDATE_WEBSITE_DATA",
  UPDATE_PAGE_DATA: "UPDATE_PAGE_DATA",
  PUBLISH_CHANGES: "PUBLISH_CHANGES",
  UNPUBLISH_PAGE: "UNPUBLISH_PAGE",
};

export const PRESENCE_EVENTS = ["sync", "join", "leave"];
export const BROADCAST_EVENTS = [
  EVENT.FORCE_TAKE_OVER,
  EVENT.TAKE_OVER_REQUEST,
  EVENT.TAKE_OVER_APPROVED,
  EVENT.TAKE_OVER_REJECTED,
  EVENT.FORCE_TAKE_OVER_REQUEST,
  EVENT.CONTINUE_EDITING_IN_THIS_CLIENT,
  EVENT.CONTINUE_EDITING_IN_THIS_TAB_REQUEST,
  EVENT.UPDATE_WEBSITE_DATA,
  EVENT.UPDATE_PAGE_DATA,
  EVENT.PUBLISH_CHANGES,
  EVENT.UNPUBLISH_PAGE,
];

export const pageUserMapAtom = atom<Record<string, ChaiOnlineUser>>({});
export const realtimeChannel = atom<RealtimeChannelAdapter | null>(null);
export const pageStatusAtom = atom<string>(PAGE_STATUS.CHECKING);
export const pageLockMetaAtom = atom<any>({});

export const getPageToUser = (stateOfPresence: any) => {
  const pageToUser: Record<string, ChaiOnlineUser> = {};
  const allPageToUser = groupBy(values(stateOfPresence).map(first).filter(Boolean), "pageId");
  Object.entries(allPageToUser).forEach(
    ([pageId, users]) => (pageToUser[pageId] = minBy(users, "onlineAt") as ChaiOnlineUser),
  );
  return pageToUser;
};

export const getMinOnlineAt = (stateOfPresence: any) => {
  const oldestOnline = minBy(values(stateOfPresence).map(first).filter(Boolean), "onlineAt") as ChaiOnlineUser;
  const minOnlineAt = oldestOnline?.onlineAt;
  return minOnlineAt ? minOnlineAt - 100 : +new Date() - 1000 * 60 * 60 * 4;
};

export const useUserId = () => {
  const { user: chaiUser } = useChaiAuth();
  return chaiUser?.id;
};

export const useChannelId = () => {
  const { data: websiteSettings } = useWebsiteSetting();
  return `WEBSITE:${websiteSettings?.appKey}`;
};

export const usePageId = () => {
  const { data: primaryPage } = usePrimaryPage();
  return primaryPage?.id;
};
