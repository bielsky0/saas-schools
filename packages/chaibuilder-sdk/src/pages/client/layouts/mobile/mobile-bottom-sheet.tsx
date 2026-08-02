import { useAtom } from "jotai";
import { ArrowLeft, Menu, MoreVertical, Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import type { ChaiBlock } from "~/types/common";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { usePubSub } from "~/hooks/use-pub-sub";
import { Button } from "~/components/ui/button";
import SettingsPanel from "~/core/components/settings/settings-panel";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { PagesTab } from "../left-panel/pages-tab";
import { ThemeTab } from "../left-panel/theme-tab";
import { MobileActions } from "./mobile-actions";
import { MobileMenu } from "./mobile-menu";
import { mobileSheetAtom, type MobileSheetState } from "./mobile-sheet-states";

const BACK_TARGET: Record<MobileSheetState, MobileSheetState> = {
  collapsed: "collapsed",
  settings: "collapsed",
  menu: "collapsed",
  theme: "menu",
  pages: "menu",
  actions: "collapsed",
};

const countDescendants = (blocks: ChaiBlock[], parentId: string): number => {
  let count = 0;
  const walk = (pid: string) => {
    blocks.filter((block) => block._parent === pid).forEach((block) => {
      count += 1;
      walk(block._id);
    });
  };
  walk(parentId);
  return count;
};

export const MobileBottomSheet = () => {
  const { t } = useTranslation();
  const [state, setMobileSheet] = useAtom(mobileSheetAtom);
  const selectedBlock = useSelectedBlock();
  const [blocks] = useBlocksStore();

  const descendantCount = useMemo(
    () => (selectedBlock ? countDescendants(blocks, selectedBlock._id) : 0),
    [blocks, selectedBlock],
  );

  const backTarget = BACK_TARGET[state];
  const title =
    state === "menu"
      ? t("Menu")
      : state === "theme"
        ? t("Theme")
        : state === "pages"
          ? t("Pages")
          : state === "actions"
            ? selectedBlock?._name || selectedBlock?._type || t("Block")
            : t("Block settings");

  const handleBack = () => setMobileSheet(backTarget);

  const handleAddBlockAtRoot = () => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, undefined);

  const handleCanvasBlocksSelected = useCallback(
    (blocks?: string[]) => {
      setMobileSheet(blocks && blocks.length > 0 ? "settings" : "collapsed");
    },
    [setMobileSheet],
  );

  const handleCanvasStyleSelected = useCallback(() => {
    setMobileSheet("settings");
  }, [setMobileSheet]);

  const handleClearCanvasSelection = useCallback(() => {
    setMobileSheet("collapsed");
  }, [setMobileSheet]);

  usePubSub<string[]>(CHAI_BUILDER_EVENTS.CANVAS_BLOCK_SELECTED, handleCanvasBlocksSelected);
  usePubSub(CHAI_BUILDER_EVENTS.CANVAS_BLOCK_STYLE_SELECTED, handleCanvasStyleSelected);
  usePubSub(CHAI_BUILDER_EVENTS.CLEAR_CANVAS_SELECTION, handleClearCanvasSelection);

  return (
    <>
      {state === "collapsed" && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-gray-200 bg-white px-2 py-1.5">
          <button
            type="button"
            onClick={() => setMobileSheet("settings")}
            className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 text-left hover:bg-gray-100">
            <span className="min-w-0 truncate text-[13px] font-medium text-gray-900">
              {selectedBlock?._name || selectedBlock?._type || t("Nothing selected")}
            </span>
            {selectedBlock && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {selectedBlock._type} · {descendantCount} {t("blocks")}
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-md"
            aria-label={t("Menu")}
            onClick={() => setMobileSheet("menu")}>
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-md"
            aria-label={t("Block actions")}
            disabled={!selectedBlock}
            onClick={() => setMobileSheet("actions")}>
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-md"
            aria-label={t("Add section")}
            onClick={handleAddBlockAtRoot}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Sheet
        open={state !== "collapsed"}
        onOpenChange={(open) => {
          if (!open) setMobileSheet("collapsed");
        }}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[85vh] overflow-hidden border-t border-gray-200 p-0">
          <SheetHeader className="flex h-11 shrink-0 flex-row items-center gap-1 border-b border-gray-200 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md"
              aria-label={t("Back")}
              onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-gray-900">
              {title}
            </SheetTitle>
            {state === "settings" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md"
                aria-label={t("Block actions")}
                onClick={() => setMobileSheet("actions")}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            )}
          </SheetHeader>
          <div className="no-scrollbar max-h-[calc(85vh-44px)] overflow-y-auto p-3">
            {state === "settings" ? (
              <SettingsPanel />
            ) : state === "menu" ? (
              <MobileMenu />
            ) : state === "theme" ? (
              <ThemeTab />
            ) : state === "pages" ? (
              <PagesTab />
            ) : (
              <MobileActions />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileBottomSheet;
