import { Suspense, useCallback, useEffect, type MouseEvent } from "react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AskAI } from "~/core/components/ask-ai-panel";
import CanvasArea from "~/core/components/canvas/canvas-area";
import { isDevelopment } from "~/core/import-html/general";
import { AddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useRightPanel } from "~/hooks/use-theme";
import { useTopBarComponent } from "~/runtime/client";
import { BuilderLeftPanel } from "./left-panel/builder-left-panel";
import { MobileBuilderLayout } from "./mobile/mobile-builder-layout";
import { useIsMobile } from "./mobile/use-is-mobile";
import { EmptyRightPanel } from "./right-panel/empty-right-panel";
import { PageSettings } from "./right-panel/page-settings";
import { TemplateSettings } from "./right-panel/template-settings";
import { ThemeEditor } from "./theme/theme-editor";

const DEFAULT_PANEL_WIDTH = 280;

const DesktopBuilderLayout = () => {
  const TopBar = useTopBarComponent();
  const [panel, setRightPanel] = useRightPanel();
  const htmlDir = useBuilderProp("htmlDir", "ltr");
  const selectedBlock = useSelectedBlock();

  useEffect(() => {
    if (panel === "page" && selectedBlock) {
      setRightPanel("block");
    }
  }, [panel, selectedBlock, setRightPanel]);

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
                  {panel === "ai" ? (
                    <AskAI />
                  ) : panel === "theme" ? (
                    <ThemeEditor />
                  ) : panel === "page" ? (
                    <PageSettings />
                  ) : panel === "template" ? (
                    <TemplateSettings />
                  ) : selectedBlock ? (
                    <SettingsPanel />
                  ) : (
                    <EmptyRightPanel />
                  )}
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

const BuilderLayout = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileBuilderLayout /> : <DesktopBuilderLayout />;
};

export { BuilderLayout };
