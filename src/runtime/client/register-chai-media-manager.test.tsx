import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { registerChaiMediaManager, useMediaManagerComponent } from "~/runtime/client/register-chai-media-manager";

describe("Media Manager Extension", () => {
  // Mock components for testing
  const DefaultComponent = () => <div data-testid="default-media-manager">Default Media Manager</div>;
  const CustomComponent = () => <div data-testid="custom-media-manager">Custom Media Manager</div>;

  beforeEach(() => {
    // Reset to default before each test
    registerChaiMediaManager(DefaultComponent);
  });

  describe("registerChaiMediaManager", () => {
    test("should replace the default media manager component", () => {
      // Verify the initial component is the default one
      const { result: initialResult } = renderHook(() => useMediaManagerComponent());
      expect(initialResult.current).toBe(DefaultComponent);

      // Register a custom media manager
      registerChaiMediaManager(CustomComponent);

      // Verify the component has been updated
      const { result: updatedResult } = renderHook(() => useMediaManagerComponent());
      expect(updatedResult.current).toBe(CustomComponent);
    });

    test("should handle repeated registrations", () => {
      // Register a custom component
      registerChaiMediaManager(CustomComponent);

      // Verify it was registered
      const { result: firstResult } = renderHook(() => useMediaManagerComponent());
      expect(firstResult.current).toBe(CustomComponent);

      // Register back to default
      registerChaiMediaManager(DefaultComponent);

      // Verify it was changed back
      const { result: secondResult } = renderHook(() => useMediaManagerComponent());
      expect(secondResult.current).toBe(DefaultComponent);
    });
  });

  describe("useMediaManagerComponent", () => {
    test("should return the currently registered component", () => {
      // Default component should be returned initially
      const { result: initialResult } = renderHook(() => useMediaManagerComponent());
      expect(initialResult.current).toBe(DefaultComponent);

      // Register a new component
      registerChaiMediaManager(CustomComponent);

      // The hook should now return the new component
      const { result: updatedResult } = renderHook(() => useMediaManagerComponent());
      expect(updatedResult.current).toBe(CustomComponent);
    });
  });
});
