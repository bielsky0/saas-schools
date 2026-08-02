import { useCallback, useLayoutEffect, useRef, type MouseEvent } from "react";
import { TooltipProvider } from "~/components/ui/tooltip";
import CanvasArea from "~/core/components/canvas/canvas-area";
import { isDevelopment } from "~/core/import-html/general";
import { AddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { canvasZoomAtom } from "~/hooks/use-canvas-zoom";
import { selectedBreakpointsAtom } from "~/hooks/use-selected-breakpoints";
import { canvasDisplayWidthAtom, canvasWidthAtom } from "~/hooks/use-screen-size-width";
import { useAtom } from "jotai";
import { MobileBottomSheet } from "./mobile-bottom-sheet";
import { MobileTopBar } from "./mobile-top-bar";

export const MobileBuilderLayout = () => {
  const htmlDir = useBuilderProp("htmlDir", "ltr");
  const [selectedBreakpoints, setSelectedBreakpoints] = useAtom(selectedBreakpointsAtom);
  const [canvasWidth, setCanvasWidth] = useAtom(canvasWidthAtom);
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useAtom(canvasDisplayWidthAtom);
  const [canvasZoom, setCanvasZoom] = useAtom(canvasZoomAtom);

  const savedStateRef = useRef({ canvasWidth, canvasDisplayWidth, canvasZoom, selectedBreakpoints });

  useLayoutEffect(() => {
    const saved = savedStateRef.current;
    const applyDeviceWidth = () => {
      const deviceWidth = window.innerWidth;
      setCanvasWidth(deviceWidth);
      setCanvasDisplayWidth(deviceWidth);
    };
    applyDeviceWidth();
    setSelectedBreakpoints(["XS"]);
    window.addEventListener("resize", applyDeviceWidth);
    return () => {
      window.removeEventListener("resize", applyDeviceWidth);
      setCanvasWidth(saved.canvasWidth);
      setCanvasDisplayWidth(saved.canvasDisplayWidth);
      setCanvasZoom(saved.canvasZoom);
      setSelectedBreakpoints(saved.selectedBreakpoints);
    };
  }, [setCanvasWidth, setCanvasDisplayWidth, setCanvasZoom, setSelectedBreakpoints]);

  const preventContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDevelopment()) e.preventDefault();
  }, []);

  return (
    <div dir={htmlDir} className="h-screen max-h-full w-screen overflow-hidden bg-background text-foreground">
      <TooltipProvider>
        <div onContextMenu={preventContextMenu} className="flex h-full max-h-full flex-col">
          <MobileTopBar />
          <main className="relative flex h-[calc(100vh-44px)] flex-1 flex-col overflow-hidden">
            <div id="canvas-container" className="flex h-full max-h-full flex-1 flex-col bg-slate-800/20">
              <CanvasArea />
            </div>
          </main>
          <MobileBottomSheet />
          <AddBlocksDialog />
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MobileBuilderLayout;
