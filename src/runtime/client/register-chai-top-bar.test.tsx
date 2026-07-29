import { renderHook } from "@testing-library/react";
import { registerChaiTopBar, useTopBarComponent } from "~/runtime/client/register-chai-top-bar";

describe("top-bar", () => {
  describe("registerChaiTopBar", () => {
    it("should register a custom component", () => {
      // Mock custom component
      const CustomTopBar = () => <div>Custom TopBar</div>;

      // Register custom component
      registerChaiTopBar(CustomTopBar);

      // Verify that useTopBarComponent returns the registered component
      const { result } = renderHook(() => useTopBarComponent());
      expect(result.current).toBe(CustomTopBar);
    });

    it("should update the component when a new one is registered", () => {
      // First component
      const FirstTopBar = () => <div>First TopBar</div>;
      registerChaiTopBar(FirstTopBar);

      // Verify first component is registered
      const { result } = renderHook(() => useTopBarComponent());
      expect(result.current).toBe(FirstTopBar);

      // Register second component
      const SecondTopBar = () => <div>Second TopBar</div>;
      registerChaiTopBar(SecondTopBar);

      // Create a new hook instance to get the updated component
      const { result: updatedResult } = renderHook(() => useTopBarComponent());

      // Verify second component is now registered
      expect(updatedResult.current).toBe(SecondTopBar);
    });
  });

  describe("useTopBarComponent", () => {
    it("should provide DefaultTopBar by default", () => {
      const { result } = renderHook(() => useTopBarComponent());

      expect(result.current).toBeDefined();
      // The component should be a function (React function component)
      expect(typeof result.current).toBe("function");
    });

    it("should return a memoized component", () => {
      const { result, rerender } = renderHook(() => useTopBarComponent());

      // Store initial result
      const initialResult = result.current;

      // Rerender without changing the component
      rerender();

      // Should be the same instance (memoized)
      expect(result.current).toBe(initialResult);
    });
  });
});
