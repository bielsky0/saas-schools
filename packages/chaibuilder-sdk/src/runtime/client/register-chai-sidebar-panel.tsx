import { filter, has, set, values } from "lodash-es";
import { ComponentType, useMemo } from "react";

export interface ChaiSidebarPanel {
  id: string;
  position: "top" | "bottom";
  view?: "standard" | "modal" | "overlay" | "drawer";
  button: React.ComponentType<{
    isActive: boolean;
    show: () => void;
    panelId: string;
    position: "top" | "bottom";
  }>;
  label: string;
  panel?: ComponentType;
  width?: number;
  isInternal?: boolean;
  icon?: React.ReactNode;
}

// Export for testing purposes
export const CHAI_BUILDER_PANELS: Record<string, ChaiSidebarPanel> = {};

export const registerChaiSidebarPanel = (panelId: string, panelOptions: Omit<ChaiSidebarPanel, "id">) => {
  if (has(CHAI_BUILDER_PANELS, panelId)) {
    console.warn(`Panel ${panelId} already registered. Overriding...`);
  }
  set(CHAI_BUILDER_PANELS, panelId, { id: panelId, ...panelOptions });
};

export const useChaiSidebarPanels = (position: "top" | "bottom") => {
  return useMemo(
    () =>
      filter(values(CHAI_BUILDER_PANELS), (panel) => {
        return panel.position === position;
      }),
    [position, CHAI_BUILDER_PANELS],
  );
};
