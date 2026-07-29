import { canvasSettingsAtom } from "~/atoms/ui";
import { useAtom } from "jotai";

export const useCanvasSettings = () => {
  return useAtom(canvasSettingsAtom);
};
