import { ArrowLeft } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { cn } from "~/core/functions/common-functions";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useLeftPanelBottom, useLeftPanelMode } from "~/hooks/use-theme";
import { PageSettings } from "~/pages/client/layouts/right-panel/page-settings";
import { TemplateSettings } from "~/pages/client/layouts/right-panel/template-settings";
import { ThemeEditor } from "~/pages/client/layouts/theme/theme-editor";
import { SeoLeftPanel } from "./seo-left-panel";
import { SectionsTab } from "./sections-tab";
import { ThemeTab } from "./theme-tab";

const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 500;

// When a block is selected, the bottom settings panel grows so only ~3 tree
// rows stay visible (selected centered via scrollTo) — Shopify-like positioning.
const BLOCK_PANEL_HEIGHT = "calc(100% - 96px)";
const CONTEXT_PANEL_HEIGHT = "45%";

export const BuilderLeftPanel = () => {
  const { t } = useTranslation();
  const [bottomPanel, setBottomPanel] = useLeftPanelBottom();
  const [mode] = useLeftPanelMode();
  const selectedBlock = useSelectedBlock();
  const [, setBlockIds] = useSelectedBlockIds();
  const { context: editorContext } = useEditorContext();
  const prevContextRef = useRef(editorContext);
  const panelRef = useRef<HTMLDivElement>(null);

  // F7.5: resizable left panel (320-500px). The panel starts at x=0, so the
  // pointer's clientX is the width directly. Document-level listeners survive
  // dragging outside the handle element.
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const onMove = (event: MouseEvent) => {
      setLeftPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, event.clientX)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => () => {
    document.body.style.userSelect = "";
  }, []);

  // F7.1/F7.2: dolny panel wysuwany wg kontekstu.
  //  - blok wybrany → SettingsPanel (block)
  //  - theme otwarty jawnie (ThemeTab) → ThemeEditor — zostaje aż do nawigacji/back
  //  - editorContext.type === "template" → TemplateSettings
  //  - editorContext.type === "page" → PageSettings
  //  - tryb SEO → panel ukryty
  useEffect(() => {
    if (mode === "seo") {
      if (bottomPanel !== null) setBottomPanel(null);
      return;
    }

    // 1) Blok zawsze wygrywa.
    if (selectedBlock) {
      if (bottomPanel !== "block") setBottomPanel("block");
      return;
    }

    // 2) Jawnie otwarty theme zostaje, dopóki użytkownik nie przejdzie na inną
    //    stronę/szablon (zmiana editorContext) lub nie wybierze bloku.
    if (bottomPanel === "theme") {
      if (prevContextRef.current !== editorContext) {
        prevContextRef.current = editorContext;
        setBottomPanel(editorContext.type === "template" ? "template" : "page");
      }
      return;
    }

    // 3) Zmiana kontekstu (strona/szablon) → pokaż ustawienia wg kontekstu.
    if (prevContextRef.current !== editorContext) {
      prevContextRef.current = editorContext;
      const next =
        editorContext.type === "template" ? "template" : editorContext.type === "page" ? "page" : null;
      if (next !== bottomPanel) setBottomPanel(next);
      return;
    }

    // 4) Odznaczono blok (klik w canvas) → wróć do panelu kontekstu.
    if (bottomPanel === "block") {
      setBottomPanel(editorContext.type === "template" ? "template" : editorContext.type === "page" ? "page" : null);
    }
  }, [selectedBlock, editorContext, bottomPanel, setBottomPanel, mode]);

  // F7.6: gdy edytujemy blok, przewiń drzewo tak, aby wybrany element znalazł
  // się pośrodku widocznych ~3 wierszy. Używamy DOM (data-node-id), bo drzewo
  // składa się z wielu instancji SectionTree (per grupa) dzielących jeden ref.
  useEffect(() => {
    if (bottomPanel !== "block" || !selectedBlock || !panelRef.current) return;
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector(`[data-node-id="${selectedBlock._id}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [bottomPanel, selectedBlock?._id]);

  const handleBack = () => {
    setBlockIds([]);
    setBottomPanel(null);
  };

  const panelTitle =
    bottomPanel === "block"
      ? selectedBlock?._name || selectedBlock?._type || t("Block settings")
      : bottomPanel === "page"
        ? t("Page settings")
        : bottomPanel === "template"
          ? t("Template settings")
          : bottomPanel === "theme"
            ? t("Theme editor")
            : "";

  const isSeoMode = mode === "seo";
  const bottomPanelVisible = bottomPanel && !isSeoMode;

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
      {/* Górna sekcja — zawartość wg wybranego trybu topbaru */}
      <div ref={panelRef} className={cn("flex min-h-0 flex-1 flex-col", bottomPanelVisible && "border-b border-gray-200")}>
        <div className="min-h-0 flex-1 px-3 py-2">
          <Suspense fallback={<div>Loading...</div>}>
            {mode === "template-settings" ? (
              <ThemeTab />
            ) : mode === "seo" ? (
              <SeoLeftPanel />
            ) : (
              <SectionsTab />
            )}
          </Suspense>
        </div>
      </div>

      {/* Dolna sekcja — slide-up panel z ustawieniami */}
      <div
        className={cn(
          "shrink-0 overflow-hidden bg-white transition-[height] duration-300 ease-in-out",
          bottomPanelVisible ? "border-t border-gray-200" : "h-0",
        )}
        style={{ height: bottomPanelVisible ? (bottomPanel === "block" ? BLOCK_PANEL_HEIGHT : CONTEXT_PANEL_HEIGHT) : 0 }}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md"
              aria-label={t("Back")}
              onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{panelTitle}</p>
              {bottomPanel === "block" && selectedBlock && (
                <p className="truncate text-[11px] text-muted-foreground">{selectedBlock._type}</p>
              )}
            </div>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            <Suspense fallback={<div>Loading...</div>}>
              {bottomPanel === "block" && <SettingsPanel />}
              {bottomPanel === "page" && <PageSettings />}
              {bottomPanel === "template" && <TemplateSettings />}
              {bottomPanel === "theme" && <ThemeEditor />}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
