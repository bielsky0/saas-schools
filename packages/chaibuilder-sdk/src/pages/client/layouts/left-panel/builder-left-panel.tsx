import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { cn } from "~/core/functions/common-functions";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useLeftPanelBottom } from "~/hooks/use-theme";
import { PagesTab } from "./pages-tab";
import { SectionsTab } from "./sections-tab";
import { ThemeTab } from "./theme-tab";

export const BuilderLeftPanel = () => {
  const { t } = useTranslation();
  const [bottomPanel, setBottomPanel] = useLeftPanelBottom();
  const selectedBlock = useSelectedBlock();
  const [, setBlockIds] = useSelectedBlockIds();

  // F7.1: gdy blok wybrany → pokaż ustawienia bloku w dolnym panelu;
  // gdy odznaczony (np. klik w canvas) → schowaj panel.
  useEffect(() => {
    if (selectedBlock && bottomPanel !== "block") {
      setBottomPanel("block");
    } else if (!selectedBlock && bottomPanel === "block") {
      setBottomPanel(null);
    }
  }, [selectedBlock, bottomPanel, setBottomPanel]);

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

  return (
    <div className="flex h-full max-h-full w-[300px] flex-col border-r border-gray-200 bg-white text-gray-900">
      {/* Górna sekcja — taby, kurczy się gdy dolny panel otwarty */}
      <div className={cn("flex min-h-0 flex-1 flex-col", bottomPanel && "border-b border-gray-200")}>
        <Tabs defaultValue="sections" className="flex h-full max-h-full flex-col">
          <TabsList className="mx-3 mt-3 grid grid-cols-3">
            <TabsTrigger value="sections">{t("Sections")}</TabsTrigger>
            <TabsTrigger value="theme">{t("Theme")}</TabsTrigger>
            <TabsTrigger value="pages">{t("Pages")}</TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="no-scrollbar h-full max-h-full overflow-y-auto px-3 py-2">
            <Suspense fallback={<div>Loading...</div>}>
              <SectionsTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="theme" className="no-scrollbar h-full max-h-full overflow-y-auto px-3 py-3">
            <Suspense fallback={<div>Loading...</div>}>
              <ThemeTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="pages" className="no-scrollbar h-full max-h-full overflow-y-auto px-3 py-2">
            <Suspense fallback={<div>Loading...</div>}>
              <PagesTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dolna sekcja — slide-up panel z ustawieniami */}
      <div
        className={cn(
          "shrink-0 overflow-hidden bg-white transition-[height] duration-300 ease-in-out",
          bottomPanel ? "h-[45%] border-t border-gray-200" : "h-0",
        )}>
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
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
