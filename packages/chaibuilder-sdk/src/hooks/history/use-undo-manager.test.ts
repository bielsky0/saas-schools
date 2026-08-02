import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { builderStore } from "~/atoms/store";
import { useUndoManager, undoManager } from "~/hooks/history/use-undo-manager";
import { builderSaveStateAtom } from "~/hooks/use-save-page";

vi.mock("~/hooks/use-builder-prop", () => ({
  useBuilderProp: vi.fn(),
}));

describe("useUndoManager", () => {
  beforeEach(async () => {
    undoManager.clear();
    builderStore.set(builderSaveStateAtom, "SAVED");

    const { useBuilderProp } = await import("~/hooks/use-builder-prop");
    (useBuilderProp as any).mockImplementation((_key: string, defaultValue: any) => defaultValue);
  });

  it("should expose hasUndo/hasRedo false on a fresh stack", () => {
    const { result } = renderHook(() => useUndoManager());

    expect(result.current.hasUndo()).toBe(false);
    expect(result.current.hasRedo()).toBe(false);
  });

  it("add() pushes an action and enables undo", () => {
    const { result } = renderHook(() => useUndoManager());

    act(() => {
      result.current.add({ undo: vi.fn(), redo: vi.fn() });
    });

    expect(result.current.hasUndo()).toBe(true);
    expect(result.current.hasRedo()).toBe(false);
  });

  it("undo() invokes the undo callback and enables redo", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { result } = renderHook(() => useUndoManager());

    act(() => {
      result.current.add({ undo, redo });
    });
    act(() => {
      result.current.undo();
    });

    expect(undo).toHaveBeenCalledTimes(1);
    expect(result.current.hasUndo()).toBe(false);
    expect(result.current.hasRedo()).toBe(true);
  });

  it("redo() invokes the redo callback and consumes the redo stack", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { result } = renderHook(() => useUndoManager());

    act(() => {
      result.current.add({ undo, redo });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(redo).toHaveBeenCalledTimes(1);
    expect(result.current.hasUndo()).toBe(true);
    expect(result.current.hasRedo()).toBe(false);
  });

  it("clear() resets both undo and redo stacks", () => {
    const { result } = renderHook(() => useUndoManager());

    act(() => {
      result.current.add({ undo: vi.fn(), redo: vi.fn() });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.hasUndo()).toBe(false);
    expect(result.current.hasRedo()).toBe(false);
  });

  it("add() marks the page as unsaved", () => {
    const { result } = renderHook(() => useUndoManager());

    act(() => {
      result.current.add({ undo: vi.fn(), redo: vi.fn() });
    });

    expect(builderStore.get(builderSaveStateAtom)).toBe("UNSAVED");
  });
});
