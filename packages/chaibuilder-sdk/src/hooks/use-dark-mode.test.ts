import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDarkMode } from "~/hooks/use-dark-mode";

describe("useDarkMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should default to light mode", () => {
    const { result } = renderHook(() => useDarkMode());

    expect(result.current[0]).toBe(false);
  });

  it("should toggle between light and dark mode", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
  });

  it("should persist the selection to localStorage", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current[1](true);
    });

    expect(localStorage.getItem("darkMode")).toBe("true");
  });

  it("should read the persisted value on mount", () => {
    localStorage.setItem("darkMode", "true");

    const { result } = renderHook(() => useDarkMode());

    expect(result.current[0]).toBe(true);
  });

  it("should be shared across hook instances through the atom", () => {
    const first = renderHook(() => useDarkMode());
    const second = renderHook(() => useDarkMode());

    act(() => {
      first.result.current[1](true);
    });

    expect(second.result.current[0]).toBe(true);
  });
});
