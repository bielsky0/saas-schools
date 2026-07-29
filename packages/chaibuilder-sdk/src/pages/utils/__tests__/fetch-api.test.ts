import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAPI } from "../fetch-api";

describe("fetchAPI", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue(new Response("ok"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call fetch with correct method, headers, and body", async () => {
    await fetchAPI("/api", { action: "TEST" });

    expect(mockFetch).toHaveBeenCalledWith("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "TEST" }),
    });
  });

  it("should merge custom headers", async () => {
    await fetchAPI("/api", { action: "TEST" }, { Authorization: "Bearer token" });

    expect(mockFetch).toHaveBeenCalledWith("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ action: "TEST" }),
    });
  });

  it("should pass AbortSignal when provided", async () => {
    const controller = new AbortController();
    await fetchAPI("/api", { action: "TEST" }, {}, { signal: controller.signal });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.signal).toBe(controller.signal);
  });

  it("should not include signal when options is undefined", async () => {
    await fetchAPI("/api", { action: "TEST" });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.signal).toBeUndefined();
  });

  it("should not include signal when options has no signal", async () => {
    await fetchAPI("/api", { action: "TEST" }, {}, {});

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.signal).toBeUndefined();
  });

  it("should abort fetch when signal is aborted", async () => {
    const controller = new AbortController();
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      if (init.signal?.aborted) {
        return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
      }
      return Promise.resolve(new Response("ok"));
    });

    controller.abort();

    await expect(
      fetchAPI("/api", { action: "TEST" }, {}, { signal: controller.signal }),
    ).rejects.toThrow("The operation was aborted.");
  });
});
