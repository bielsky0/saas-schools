import { useAtom } from "jotai";
import { has } from "lodash-es";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import type { ChaiBlock } from "~/types/common";
import { useCopyBlocks } from "~/hooks/use-copy-blockIds";
import { useDuplicateBlocks } from "~/hooks/use-duplicate-blocks";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { Copy, Pencil, SquareKanban, ChevronRight } from "lucide-react";
import { MobileTree } from "./mobile-tree";
import { type SectionTreeNode } from "../left-panel/section-groups";
import { mobileSheetAtom } from "./mobile-sheet-states";
import { SheetHeader } from "~/components/ui/sheet";

const buildChildTree = (blocks: ChaiBlock[], parentId: string): SectionTreeNode[] =>
  blocks
    .filter((block) => block._parent === parentId)
    .map((block) => ({ _id: block._id, _type: block._type, _name: block._name, ...(block as object) }));

const ActionRow = ({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
      danger ? "text-red-600 hover:bg-red-50" : "text-gray-900 hover:bg-gray-100"
    }`}>
    <span className={`shrink-0 ${danger ? "text-red-500" : "text-gray-500"}`}>{icon}</span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
  </button>
);

export const MobileActions = () => {
  const { t } = useTranslation();
  const [, setMobileSheet] = useAtom(mobileSheetAtom);
  const [selectedIds, setIds] = useSelectedBlockIds();
  const selectedBlock = useSelectedBlock();
  const [blocks] = useBlocksStore();
  const duplicateBlocks = useDuplicateBlocks();
  const removeBlocks = useRemoveBlocks();
  const [, copyBlocks] = useCopyBlocks();
  const updateBlockProps = useUpdateBlocksProps();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  const childTree = useMemo(
    () => (selectedBlock ? buildChildTree(blocks, selectedBlock._id) : []),
    [blocks, selectedBlock],
  );

  const isHidden = useMemo(
    () => (selectedBlock ? (has(selectedBlock, "_show") ? !selectedBlock._show : false) : false),
    [selectedBlock],
  );

  const handleDelete = useCallback(() => {
    if (!selectedBlock) return;
    removeBlocks(selectedIds);
    setIds([]);
    setMobileSheet("collapsed");
  }, [selectedBlock, removeBlocks, selectedIds, setIds, setMobileSheet]);

  const handleHideToggle = useCallback(() => {
    if (!selectedBlock) return;
    updateBlockProps([selectedBlock._id], { _show: isHidden });
  }, [selectedBlock, isHidden, updateBlockProps]);

  const handleRename = useCallback(() => {
    if (!selectedBlock || !name.trim()) {
      setEditingName(false);
      return;
    }
    updateBlockProps([selectedBlock._id], { _name: name.trim() });
    setEditingName(false);
  }, [selectedBlock, name, updateBlockProps]);

  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    copyBlocks(selectedIds);
  }, [copyBlocks, selectedIds]);

  const handleDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    duplicateBlocks(selectedIds);
  }, [duplicateBlocks, selectedIds]);

  const handleAddBlock = useCallback(() => {
    if (!selectedBlock) return;
    pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, selectedBlock);
  }, [selectedBlock]);

  const handleSelectChild = useCallback(
    (nodeId: string) => {
      setIds([nodeId]);
      setMobileSheet("settings");
    },
    [setIds, setMobileSheet],
  );

  return (
    <div className="no-scrollbar flex max-h-full flex-col overflow-y-auto">
      <SheetHeader className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-gray-900">
          {selectedBlock?._name || selectedBlock?._type || t("Block")}
        </span>
      </SheetHeader>

      <div className="mt-2">
        <ActionRow icon={<Copy className="h-4 w-4" />} label={t("Copy")} onClick={handleCopy} />
        <ActionRow icon={<SquareKanban className="h-4 w-4" />} label={t("Duplicate")} onClick={handleDuplicate} />
        {editingName ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="h-8 text-[13px]"
            />
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleRename}>
              {t("Done")}
            </Button>
          </div>
        ) : (
          <ActionRow
            icon={<Pencil className="h-4 w-4" />}
            label={t("Name")}
            onClick={() => {
              setName(selectedBlock?._name || "");
              setEditingName(true);
            }}
          />
        )}
        <ActionRow icon={isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} label={t("Hide")} onClick={handleHideToggle} />
        <ActionRow icon={<Trash2 className="h-4 w-4" />} label={t("Delete section")} onClick={handleDelete} danger />
      </div>

      <Separator className="my-2" />

      <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("Blocks in section")}
      </div>
      <div className="min-h-0">
        {childTree.length > 0 ? (
          <MobileTree data={childTree} maxHeight={220} onSelect={handleSelectChild} />
        ) : (
          <p className="px-2.5 py-3 text-xs text-muted-foreground">{t("No blocks")}</p>
        )}
      </div>

      <Button variant="outline" className="mt-2 h-9 w-full justify-start gap-2 text-xs" onClick={handleAddBlock}>
        <Plus className="h-3.5 w-3.5" />
        {t("Add block")}
      </Button>
    </div>
  );
};

export default MobileActions;
