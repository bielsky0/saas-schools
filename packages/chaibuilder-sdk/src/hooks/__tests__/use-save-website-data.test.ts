import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { builderStore } from "~/atoms/store";
import { chaiDesignTokensAtom, componentTokensAtom } from "~/atoms/builder";
import { defaultThemeValues } from "~/hooks/default-theme-options";
import { useSaveWebsiteData } from "~/hooks/use-save-website-data";
import type { ChaiDesignTokens, ComponentTokens } from "~/types/types";

vi.mock("~/hooks/use-builder-prop", () => ({
  useBuilderProp: vi.fn(),
}));

vi.mock("~/hooks/use-theme", () => ({
  useTheme: vi.fn(),
}));

const tokensFixture: ChaiDesignTokens = {
  "radius-lg": { name: "Radius LG", value: "12px" },
};

const componentTokensFixture: ComponentTokens = {
  "--cmp-btn-radius": "8px",
  "--cmp-container-max-width": "1200px",
};

describe("useSaveWebsiteData", () => {
  let mockOnSaveWebsiteData: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnSaveWebsiteData = vi.fn(async () => {});

    const { useBuilderProp } = await import("~/hooks/use-builder-prop");
    const { useTheme } = await import("~/hooks/use-theme");

    (useBuilderProp as any).mockImplementation((key: string, defaultValue: any) => {
      if (key === "onSaveWebsiteData") return mockOnSaveWebsiteData;
      return defaultValue;
    });
    (useTheme as any).mockReturnValue([defaultThemeValues]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onSaveWebsiteData with the passed payload", async () => {
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveWebsiteData({ type: "THEME", data: defaultThemeValues });
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(1);
    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({ type: "THEME", data: defaultThemeValues });
  });

  it("should not re-enter while a save is in flight", async () => {
    let release!: () => void;
    mockOnSaveWebsiteData.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));

    const { result } = renderHook(() => useSaveWebsiteData());

    const first = result.current.saveWebsiteData({ type: "THEME", data: defaultThemeValues });
    const second = result.current.saveWebsiteData({ type: "THEME", data: defaultThemeValues });

    release();
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(1);
  });

  it("should call onSaveWebsiteData again after a save completes", async () => {
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveWebsiteData({ type: "THEME", data: defaultThemeValues });
      await result.current.saveWebsiteData({ type: "THEME", data: defaultThemeValues });
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(2);
  });

  it("saveTheme should save the current theme from useTheme", async () => {
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveTheme();
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "THEME",
      data: defaultThemeValues,
    });
  });

  it("saveTheme should prefer the explicit theme data over the hook value", async () => {
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveTheme(defaultThemeValues);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "THEME",
      data: defaultThemeValues,
    });
  });

  it("saveDesignTokens should save tokens from the atom store when none passed", async () => {
    builderStore.set(chaiDesignTokensAtom, tokensFixture);

    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveDesignTokens();
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "DESIGN_TOKENS",
      data: tokensFixture,
    });
  });

  it("saveDesignTokens should prefer the explicit tokens", async () => {
    builderStore.set(chaiDesignTokensAtom, tokensFixture);

    const explicit: ChaiDesignTokens = {
      "radius-sm": { name: "Radius SM", value: "4px" },
    };
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveDesignTokens(explicit);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "DESIGN_TOKENS",
      data: explicit,
    });
  });

  it("debouncedSaveTheme should save after the debounce delay", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSaveWebsiteData());

    act(() => {
      result.current.debouncedSaveTheme();
    });
    expect(mockOnSaveWebsiteData).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(1);
    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "THEME",
      data: defaultThemeValues,
    });
  });

  it("debouncedSaveDesignTokens should save after the debounce delay", async () => {
    vi.useFakeTimers();
    builderStore.set(chaiDesignTokensAtom, tokensFixture);

    const { result } = renderHook(() => useSaveWebsiteData());

    act(() => {
      result.current.debouncedSaveDesignTokens();
    });
    expect(mockOnSaveWebsiteData).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(1);
    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "DESIGN_TOKENS",
      data: tokensFixture,
    });
  });

  it("saveComponentTokens should save tokens from the atom store when none passed", async () => {
    builderStore.set(componentTokensAtom, componentTokensFixture);

    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveComponentTokens();
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "COMPONENT_TOKENS",
      data: componentTokensFixture,
    });
  });

  it("saveComponentTokens should prefer the explicit tokens", async () => {
    builderStore.set(componentTokensAtom, componentTokensFixture);

    const explicit: ComponentTokens = { "--cmp-btn-height": "44px" };
    const { result } = renderHook(() => useSaveWebsiteData());

    await act(async () => {
      await result.current.saveComponentTokens(explicit);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "COMPONENT_TOKENS",
      data: explicit,
    });
  });

  it("debouncedSaveComponentTokens should save after the debounce delay", async () => {
    vi.useFakeTimers();
    builderStore.set(componentTokensAtom, componentTokensFixture);

    const { result } = renderHook(() => useSaveWebsiteData());

    act(() => {
      result.current.debouncedSaveComponentTokens();
    });
    expect(mockOnSaveWebsiteData).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockOnSaveWebsiteData).toHaveBeenCalledTimes(1);
    expect(mockOnSaveWebsiteData).toHaveBeenCalledWith({
      type: "COMPONENT_TOKENS",
      data: componentTokensFixture,
    });
  });
});
