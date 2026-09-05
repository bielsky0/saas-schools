import { Cross1Icon } from "@radix-ui/react-icons";
import { Suspense, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { TypeIcon } from "~/core/components/sidepanels/panels/outline/block-type-icon";
import { cn } from "~/core/functions/common-functions";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useLeftPanelMode } from "~/hooks/use-theme";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { SeoLeftPanel } from "./seo-left-panel";
import { SectionsTab } from "./sections-tab";
import { TemplateSettingsTab } from "./theme-tab";
import { BlockBreadcrumb } from "./block-breadcrumb";
import { BlockQuickActions } from "./block-quick-actions";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 560;
const PANEL_WIDTH_STORAGE_KEY = "chai-builder-left-panel-width";

export const BuilderLeftPanel = () => {
  const { t } = useTranslation();
  const [mode] = useLeftPanelMode();
  const selectedBlock = useSelectedBlock();
  const [, setBlockIds] = useSelectedBlockIds();
  const { data: currentPage } = usePrimaryPage();

  // F7.5: resizable left panel (360-560px). The panel starts at x=0, so the
  // pointer's clientX is the width directly. Document-level listeners survive
  // dragging outside the handle element. Width persists across reloads.
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    if (typeof window === "undefined") return MIN_PANEL_WIDTH;
    const saved = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= MIN_PANEL_WIDTH && saved <= MAX_PANEL_WIDTH
      ? saved
      : MIN_PANEL_WIDTH;
  });
  const widthRef = useRef(leftPanelWidth);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const onMove = (event: MouseEvent) => {
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, event.clientX));
      widthRef.current = next;
      setLeftPanelWidth(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      try {
        window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(widthRef.current));
      } catch {
        // storage unavailable — width simply won't persist
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  const clearBlockSelection = useCallback(() => {
    setBlockIds([]);
  }, [setBlockIds]);

  const isSeoMode = mode === "seo";
  const blockSelected = !isSeoMode && !!selectedBlock;

  return (
    <div
      className="relative flex h-full max-h-full flex-col border-r border-gray-200 bg-white text-gray-900"
      style={{ width: leftPanelWidth }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("Resize left panel")}
        onMouseDown={onResizeStart}
        className="absolute -right-1.5 top-0 z-10 h-full w-3 cursor-col-resize touch-none select-none hover:bg-blue-400/30 active:bg-blue-400/40"
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header: page name (Sekcje) or selected-block breadcrumb */}
        {blockSelected ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-[#EBEBEB] px-4 pb-3 pt-4">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#4A4A4A]">
              <TypeIcon type={selectedBlock._type} />
            </span>
            <BlockBreadcrumb blockId={selectedBlock._id} />
            <BlockQuickActions />
            <button
              type="button"
              onClick={clearBlockSelection}
              aria-label={t("Close")}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#4A4A4A] hover:bg-black/[.06] hover:text-[#303030]">
              <Cross1Icon className="h-4 w-4" />
            </button>
          </div>
        ) : !isSeoMode && mode !== "template-settings" ? (
          <>
            <div className="px-4 pt-4 pb-3">
              <h1 className="text-[14px] font-semibold leading-5 text-[#303030]">
                {currentPage?.name || t("Page")}
              </h1>
            </div>
            <div className="h-px bg-[#EBEBEB]" />
          </>
        ) : null}

        {/* Content: inline block settings (blocks always win) / mode tabs */}
        <div className={cn("min-h-0 flex-1", blockSelected ? "no-scrollbar overflow-y-auto px-4 py-3" : "px-3 py-2")}>
          <Suspense fallback={<div>Loading...</div>}>
            {isSeoMode ? (
              <SeoLeftPanel />
            ) : blockSelected ? (
              <SettingsPanel />
            ) : mode === "template-settings" ? (
              <TemplateSettingsTab />
            ) : (
              <SectionsTab />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default BuilderLeftPanel;
