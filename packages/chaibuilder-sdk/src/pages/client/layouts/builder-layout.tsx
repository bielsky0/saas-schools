import { Suspense, useCallback, type MouseEvent } from "react";
import { TooltipProvider } from "~/components/ui/tooltip";
import CanvasArea from "~/core/components/canvas/canvas-area";
import { isDevelopment } from "~/core/import-html/general";
import { AddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useTopBarComponent } from "~/runtime/client";
import { BuilderLeftPanel } from "./left-panel/builder-left-panel";
import { MobileBuilderLayout } from "./mobile/mobile-builder-layout";
import { useIsMobile } from "./mobile/use-is-mobile";

const DesktopBuilderLayout = () => {
  const TopBar = useTopBarComponent();
  const htmlDir = useBuilderProp("htmlDir", "ltr");

  const preventContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDevelopment()) e.preventDefault();
  }, []);

  return (
    <div dir={htmlDir} className="h-screen max-h-full w-screen overflow-x-hidden bg-background text-foreground">
      <TooltipProvider>
        <div onContextMenu={preventContextMenu} className="flex h-full max-h-full flex-col">
          <div className="flex h-[50px] w-screen items-center border-b border-gray-200 bg-gray-50 text-gray-900">
            <Suspense>
              <TopBar />
            </Suspense>
          </div>
          <main className="relative flex h-[calc(100vh-56px)] max-w-full flex-1 flex-row">
            <BuilderLeftPanel />
            <div id="canvas-container" className="flex h-full max-h-full flex-1 flex-col bg-slate-800/20">
              <Suspense>
                <CanvasArea />
              </Suspense>
            </div>
          </main>
        </div>
        <AddBlocksDialog />
      </TooltipProvider>
    </div>
  );
};

const BuilderLayout = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileBuilderLayout /> : <DesktopBuilderLayout />;
};

export { BuilderLayout };
