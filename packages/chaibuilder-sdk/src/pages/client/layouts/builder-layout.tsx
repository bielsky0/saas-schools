import { Suspense, useCallback, type MouseEvent } from "react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AskAI } from "~/core/components/ask-ai-panel";
import CanvasArea from "~/core/components/canvas/canvas-area";
import { isDevelopment } from "~/core/import-html/general";
import { AddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useRightPanel } from "~/hooks/use-theme";
import { useTopBarComponent } from "~/runtime/client";
import { BuilderLeftPanel } from "./left-panel/builder-left-panel";
import { ThemeEditor } from "./theme/theme-editor";

const DEFAULT_PANEL_WIDTH = 280;

const BuilderLayout = () => {
  const TopBar = useTopBarComponent();
  const [panel] = useRightPanel();
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
            <div
              id="right-panel"
              className="h-full max-h-full border-l border-gray-200 bg-white text-gray-900"
              style={{ width: panel === "ai" ? 0 : DEFAULT_PANEL_WIDTH }}>
              <div className="no-scrollbar h-full max-h-full overflow-hidden p-3">
                <Suspense fallback={<div>Loading...</div>}>
                  {panel === "ai" ? <AskAI /> : panel === "theme" ? <ThemeEditor /> : <SettingsPanel />}
                </Suspense>
              </div>
            </div>
          </main>
        </div>
        <AddBlocksDialog />
      </TooltipProvider>
    </div>
  );
};

export { BuilderLayout };
