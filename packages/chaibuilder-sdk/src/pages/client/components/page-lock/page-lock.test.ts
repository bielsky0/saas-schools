import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { builderStore } from "~/atoms/store";
import {
  PAGE_STATUS,
  getMinOnlineAt,
  getPageToUser,
  pageLockMetaAtom,
  pageStatusAtom,
} from "~/pages/client/components/page-lock/page-lock-utils";
import {
  usePageLockMeta,
  usePageLockStatus,
} from "~/pages/client/components/page-lock/page-lock-hook";

describe("getPageToUser", () => {
  it("should map presence state to the oldest online user per page", () => {
    const presence = {
      "client-a": [{ pageId: "p1", userId: "u1", clientId: "client-a", onlineAt: 200 }],
      "client-b": [{ pageId: "p1", userId: "u2", clientId: "client-b", onlineAt: 300 }],
      "client-c": [{ pageId: "p2", userId: "u3", clientId: "client-c", onlineAt: 50 }],
    };

    const result = getPageToUser(presence);

    expect(result).toEqual({
      p1: { pageId: "p1", userId: "u1", clientId: "client-a", onlineAt: 200 },
      p2: { pageId: "p2", userId: "u3", clientId: "client-c", onlineAt: 50 },
    });
  });

  it("should filter out empty presence entries", () => {
    const presence = {
      "client-a": [],
      "client-b": [null],
      "client-c": [{ pageId: "p1", userId: "u1", clientId: "client-c", onlineAt: 10 }],
    };

    const result = getPageToUser(presence);

    expect(result).toEqual({
      p1: { pageId: "p1", userId: "u1", clientId: "client-c", onlineAt: 10 },
    });
  });
});

describe("getMinOnlineAt", () => {
  it("should return the oldest onlineAt minus 100ms", () => {
    const presence = {
      "client-a": [{ pageId: "p1", userId: "u1", clientId: "client-a", onlineAt: 500 }],
      "client-b": [{ pageId: "p1", userId: "u2", clientId: "client-b", onlineAt: 1000 }],
    };

    expect(getMinOnlineAt(presence)).toBe(400);
  });

  it("should fall back to 4 hours ago when presence is empty", () => {
    const now = +new Date();
    const result = getMinOnlineAt({});

    expect(result).toBeLessThanOrEqual(now - 1000 * 60 * 60 * 4);
  });
});

describe("usePageLockStatus", () => {
  beforeEach(() => {
    builderStore.set(pageStatusAtom, PAGE_STATUS.CHECKING);
  });

  it("should report isLocked for LOCKED", () => {
    builderStore.set(pageStatusAtom, PAGE_STATUS.LOCKED);

    const { result } = renderHook(() => usePageLockStatus());

    expect(result.current.isLocked).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.pageStatus).toBe(PAGE_STATUS.LOCKED);
  });

  it("should report isLocked for ACTIVE_IN_ANOTHER_TAB", () => {
    builderStore.set(pageStatusAtom, PAGE_STATUS.ACTIVE_IN_ANOTHER_TAB);

    const { result } = renderHook(() => usePageLockStatus());

    expect(result.current.isLocked).toBe(true);
  });

  it("should report isEditing for EDITING", () => {
    builderStore.set(pageStatusAtom, PAGE_STATUS.EDITING);

    const { result } = renderHook(() => usePageLockStatus());

    expect(result.current.isEditing).toBe(true);
    expect(result.current.isLocked).toBe(false);
  });

  it("should be neither locked nor editing for CHECKING", () => {
    builderStore.set(pageStatusAtom, PAGE_STATUS.CHECKING);

    const { result } = renderHook(() => usePageLockStatus());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  it("setPageStatus should update the status atom", () => {
    const { result } = renderHook(() => usePageLockStatus());

    act(() => {
      result.current.setPageStatus(PAGE_STATUS.LOCKED);
    });

    expect(builderStore.get(pageStatusAtom)).toBe(PAGE_STATUS.LOCKED);
    expect(result.current.isLocked).toBe(true);
  });
});

describe("usePageLockMeta", () => {
  beforeEach(() => {
    builderStore.set(pageLockMetaAtom, {});
  });

  it("should read and set the page lock metadata", () => {
    const { result } = renderHook(() => usePageLockMeta());

    act(() => {
      result.current.setPageLockMeta({ type: "TAKE_OVER_REQUEST", requestingUserId: "u1" });
    });

    expect(result.current.pageLockMeta).toEqual({
      type: "TAKE_OVER_REQUEST",
      requestingUserId: "u1",
    });
    expect(builderStore.get(pageLockMetaAtom)).toEqual({
      type: "TAKE_OVER_REQUEST",
      requestingUserId: "u1",
    });
  });
});
