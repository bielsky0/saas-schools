import { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAI_BUILDER_PANELS, registerChaiSidebarPanel } from "~/runtime/client/register-chai-sidebar-panel";

describe("registerChaiSidebarPanel", () => {
  beforeEach(() => {
    // Clear registry before each test - much simpler with direct access
    Object.keys(CHAI_BUILDER_PANELS).forEach((key) => {
      delete CHAI_BUILDER_PANELS[key];
    });

    // Spy on console.warn
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should register a panel successfully", () => {
    // Mock components
    const MockButton = () => <div>Test Button</div>;
    const MockPanel = () => <div>Test Panel</div>;

    // Mock panel options
    const panelOptions = {
      position: "top" as const,
      button: MockButton,
      label: "Test Panel",
      panel: MockPanel as ComponentType,
    };

    // Register panel
    registerChaiSidebarPanel("test-panel", panelOptions);

    // Direct check of the internal registry
    expect(Object.keys(CHAI_BUILDER_PANELS)).toHaveLength(1);
    expect(CHAI_BUILDER_PANELS["test-panel"]).toMatchObject({
      id: "test-panel",
      position: "top",
      label: "Test Panel",
    });
  });

  it("should warn when registering a panel with an existing ID and override it", () => {
    // First register a panel
    const FirstButton = () => <div>Original Button</div>;
    const FirstPanel = () => <div>Original Panel</div>;
    registerChaiSidebarPanel("duplicate-panel", {
      position: "top",
      button: FirstButton,
      label: "Original Panel",
      panel: FirstPanel as ComponentType,
    });

    // Then register another panel with the same ID but different position
    const SecondButton = () => <div>Override Button</div>;
    const SecondPanel = () => <div>Override Panel</div>;
    registerChaiSidebarPanel("duplicate-panel", {
      position: "bottom",
      button: SecondButton,
      label: "Override Panel",
      panel: SecondPanel as ComponentType,
    });

    // Check if warning was logged
    expect(console.warn).toHaveBeenCalledWith("Panel duplicate-panel already registered. Overriding...");

    // Direct verification of the internal state
    expect(CHAI_BUILDER_PANELS["duplicate-panel"]).toMatchObject({
      id: "duplicate-panel",
      position: "bottom",
      label: "Override Panel",
    });
  });

  it("should respect optional panel properties", () => {
    // Mock components
    const MockButton = () => <div>Optional Props Button</div>;
    const MockPanel = () => <div>Optional Props Panel</div>;

    // Register panel with optional properties
    registerChaiSidebarPanel("optional-props-panel", {
      position: "bottom",
      button: MockButton,
      label: "Optional Props Panel",
      panel: MockPanel as ComponentType,
      view: "modal",
      width: 400,
      isInternal: true,
    });

    // Direct access to the registered panel
    const panel = CHAI_BUILDER_PANELS["optional-props-panel"];

    // Verify all properties
    expect(panel).toBeDefined();
    expect(panel).toMatchObject({
      id: "optional-props-panel",
      position: "bottom",
      label: "Optional Props Panel",
      view: "modal",
      width: 400,
      isInternal: true,
    });
  });
});
