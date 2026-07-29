import { useAtom } from "jotai";
import { canvasIframeAtom } from "~/atoms/ui";

export const useCanvasIframe = () => useAtom(canvasIframeAtom);
