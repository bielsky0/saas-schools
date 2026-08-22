import { lazy, Suspense, useCallback, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import "./tokens/shopify-tokens.css";
import { Cross1Icon, LightningBoltIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { Button } from "~/components/ui/button";
import { TooltipProvider } from "~/components/ui/tooltip";
import CanvasArea from "~/core/components/canvas/canvas-area";
import { isDevelopment } from "~/core/import-html/general";
import { AddBlocksDialog } from "~/core/components/layout/add-blocks-dialog";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useAiDrawerOpen } from "~/hooks/use-theme";
import { useTopBarComponent } from "~/runtime/client";
import { BuilderLeftPanel } from "./left-panel/builder-left-panel";
import { MobileBuilderLayout } from "./mobile/mobile-builder-layout";
import { useIsMobile } from "./mobile/use-is-mobile";

const AI_PANEL_WIDTH = 280;

const AiPanelContent = lazy(() => import("~/pages/panels/ai-panel/ai-panel-content"));

const AiPanel = () => {
  const [aiDrawerOpen, setAiDrawerOpen] = useAiDrawerOpen();
  const { t } = useTranslation();
  return (
    <motion.div
      id="ai-panel"
      className="h-full max-h-full overflow-hidden border-l border-gray-200 bg-white text-gray-900"
      initial={{ width: 0 }}
      animate={{ width: aiDrawerOpen ? AI_PANEL_WIDTH : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}>
      <div className="flex h-full w-[280px] flex-col overflow-hidden p-3">
        <div className="flex items-center justify-between">
          <h2 className="-mt-1 flex items-center space-x-1 text-base font-bold">
            <LightningBoltIcon className="rtl:ml-2" />
            <span>{t("AI Assistant")}</span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-xs"
            onClick={() => setAiDrawerOpen(false)}>
            <Cross1Icon className="h-4 w-4 rtl:ml-2" />
            <span className="sr-only">{t("Close")}</span>
          </Button>
        </div>
        <div className="flex h-full max-h-full w-full">
          <Suspense fallback={<div>Loading...</div>}>
            <AiPanelContent />
          </Suspense>
        </div>
      </div>
    </motion.div>
  );
};

const DesktopBuilderLayout = () => {
  const { t } = useTranslation();
  const TopBar = useTopBarComponent();
  const htmlDir = useBuilderProp("htmlDir", "ltr");

  const preventContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDevelopment()) e.preventDefault();
  }, []);

  return (
    <div dir={htmlDir} className="h-screen max-h-full w-screen overflow-x-hidden bg-background text-foreground">
      <TooltipProvider>
        <a
          href="#canvas-container"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white">
          {t("Skip to canvas")}
        </a>
        <div onContextMenu={preventContextMenu} className="flex h-full max-h-full flex-col">
          <div className="flex h-12 w-screen items-center border-b border-gray-200 bg-gray-50 text-gray-900">
            <Suspense>
              <TopBar />
            </Suspense>
          </div>
          <main className="relative flex h-[calc(100vh-49px)] max-w-full flex-1 flex-row">
            <BuilderLeftPanel />
            <div id="canvas-container" className="flex h-full max-h-full flex-1 flex-col bg-slate-800/20">
              <Suspense>
                <CanvasArea />
              </Suspense>
            </div>
            <AiPanel />
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
