import { useDebouncedCallback } from "@react-hookz/web";
import { useAtom } from "jotai";
import { find, first } from "lodash-es";
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoveHandler, NodeRendererProps, RenameHandler, Tree, TreeApi } from "react-arborist";
import React from "react";
import { treeRefAtom, dropCursorInvalidAtom } from "~/atoms/ui";
import { DefaultCursor } from "~/core/components/sidepanels/panels/outline/default-cursor";
import {
  close,
  defaultShortcuts,
  open,
  selectFirst,
  selectLast,
  selectNext,
  selectParent,
  selectPrev,
} from "~/core/components/sidepanels/panels/outline/default-shortcuts";
import { Node } from "~/core/components/sidepanels/panels/outline/node";
import { SaveToLibraryModal } from "~/core/components/sidepanels/panels/outline/upsert-library-block-modal";
import { PasteAtRootContextMenu } from "~/core/components/sidepanels/panels/outline/paste-into-root";
import { ROOT_TEMP_KEY } from "~/core/constants/STRINGS";
import { canAcceptChildBlock } from "~/core/functions/block-helpers";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useCutBlockIds } from "~/hooks/use-cut-blockIds";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { ChaiBlock } from "~/types/common";
import { SectionTreeNode } from "./section-groups";

interface SectionTreeProps {
  data: SectionTreeNode[];
  nodeRenderer?: React.ComponentType<NodeRendererProps<any>>;
}

const ROW_HEIGHT = 30;
const TREE_PADDING = 8;

const useCanMove = () => {
  const [blocks] = useBlocksStore();
  return (ids: string[], newParentId: string | null) => {
    if (!newParentId) {
      const blockType = first(ids.map((id) => find(blocks, { _id: id })?._type));
      return !!blockType;
    }
    const newParentType = find(blocks, { _id: newParentId });
    if (!newParentType) return false;
    const blockType = first(ids.map((id) => find(blocks, { _id: id })?._type));
    if (!blockType) return false;
    return canAcceptChildBlock((newParentType as ChaiBlock)._type, blockType);
  };
};

const filterOutCutBlocks = (data: SectionTreeNode[], cutIds: string[]): SectionTreeNode[] =>
  data
    .filter((node) => !cutIds.includes(node._id))
    .map((node) => ({
      ...node,
      children: node.children ? filterOutCutBlocks(node.children, cutIds) : [],
    }));

export const SectionTree = ({ data, nodeRenderer }: SectionTreeProps) => {
  const [ids, setIds] = useSelectedBlockIds();
  const [cutBlocksIds] = useCutBlockIds();
  const updateBlockProps = useUpdateBlocksProps();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { moveBlocks } = useBlocksStoreUndoableActions();
  const canMove = useCanMove();
  const treeRef = useRef<TreeApi<any>>(null);
  const [, setTreeRef] = useAtom(treeRefAtom);
  const [, setDropCursorInvalid] = useAtom(dropCursorInvalidAtom);
  const [parentContext, setParentContext] = useState<{ x: number; y: number } | null>(null);
  const [treeHeight, setTreeHeight] = useState(() => data.length * ROW_HEIGHT + TREE_PADDING);
  const NodeRenderer = nodeRenderer ?? Node;

  const treeData = useMemo(
    () => filterOutCutBlocks(data, cutBlocksIds),
    [data, cutBlocksIds],
  );

  const syncHeight = useCallback(() => {
    const visible = treeRef.current?.visibleNodes?.length;
    if (visible) setTreeHeight(visible * ROW_HEIGHT + TREE_PADDING);
  }, []);

  useEffect(() => {
    syncHeight();
  }, [treeData, syncHeight]);

  const clearSelection = () => {
    setIds([]);
    setStyleBlocks([]);
  };

  const onRename: RenameHandler<any> = ({ id, name, node }) => {
    updateBlockProps([id], { _name: name }, node.data._name);
  };
  const onMove: MoveHandler<any> = ({ dragIds, parentId, index }) => {
    setDropCursorInvalid(false);
    if (canMove(dragIds, parentId)) moveBlocks(dragIds, parentId ?? undefined, index);
  };

  const onSelect = (nodes: any) => {
    if (nodes.length === 0) return;
    const nodeId = nodes[0] ? nodes[0].id : "";
    setStyleBlocks([]);
    setIds([nodeId]);
  };

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (parentContext) setParentContext(null);

    const target = e.target as HTMLDivElement;
    const nodeId =
      target.getAttribute("data-node-id") || target.closest("[data-node-id]")?.getAttribute("data-node-id");
    if (nodeId) {
      setStyleBlocks([]);
      setIds([nodeId]);
    } else {
      setStyleBlocks([]);
      setIds([]);
      setParentContext({ x: e.clientX, y: e.clientY });
    }
  };

  const debouncedDisableDrop = useDebouncedCallback(
    ({ parentNode, dragNodes }) => {
      const disabled = !dragNodes?.length
        ? false
        : parentNode?.data._type === ROOT_TEMP_KEY ||
          !canAcceptChildBlock(parentNode?.data._type, dragNodes[0]?.data._type);
      setDropCursorInvalid(Boolean(disabled));
      return disabled;
    },
    [],
    300,
  );

  const evaluateCondition = (condition: string, selectedNode: any): boolean => {
    if (!condition) return true;
    const context = {
      isLeaf: !selectedNode.isInternal,
      isClosed: !selectedNode.isOpen,
      isOpen: selectedNode.isOpen,
    };
    try {
      let evalCondition = condition;
      (Object.keys(context) as Array<keyof typeof context>).forEach((key) => {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        evalCondition = evalCondition.replace(regex, String(context[key]));
      });
      return new Function(`return ${evalCondition}`)();
    } catch {
      console.warn("Invalid condition expression:", condition);
      return false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!treeRef.current) return;
    const tree = treeRef.current;
    const selectedNode = tree.selectedNodes[0];
    if (!selectedNode) return;

    setIds([selectedNode.id]);
    setStyleBlocks([]);

    const isLeaf = !selectedNode.isInternal;
    const isClosed = !selectedNode.isOpen;
    const isOpen = selectedNode.isOpen;

    const shortcut = defaultShortcuts.find(
      (s) => s.key === e.key && (!s.when || evaluateCondition(s.when, selectedNode)),
    );

    if (shortcut) {
      e.preventDefault();
      switch (shortcut.command) {
        case "selectNext":
          selectNext(tree);
          break;
        case "selectPrev":
          selectPrev(tree);
          break;
        case "selectParent":
          selectParent(tree, isLeaf || isClosed);
          break;
        case "close":
          close(tree, isOpen);
          break;
        case "open":
          open(tree, isClosed);
          break;
        case "selectFirst":
          selectFirst(tree);
          break;
        case "selectLast":
          selectLast(tree);
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    const updateTreeRef = () => {
      if (treeRef.current) {
        //@ts-ignore
        setTreeRef(treeRef.current);
      }
    };
    updateTreeRef();
    const observer = new MutationObserver(updateTreeRef);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [setTreeRef]);

  return (
    <div className="flex flex-col" onClick={() => clearSelection()}>
      <div
        className="group relative text-sm"
        onKeyDown={(e) => {
          if (treeRef.current && !treeRef.current.isEditing) {
            handleKeyDown(e as unknown as KeyboardEvent);
          }
        }}>
        <Tree
            ref={treeRef}
            height={treeHeight}
            className="max-w-full"
            rowClassName="flex items-center h-full"
            selection={ids[0] || ""}
            onRename={onRename}
            openByDefault={false}
            onMove={onMove}
            onToggle={() => setTimeout(syncHeight, 0)}
            data={treeData}
            renderCursor={DefaultCursor}
            onSelect={onSelect}
            childrenAccessor={(d: any) => d.children}
            width={"100%"}
            rowHeight={30}
            renderDragPreview={() => null}
            indent={18}
            onContextMenu={onContextMenu}
            disableDrop={debouncedDisableDrop as any}
            idAccessor={"_id"}>
            {NodeRenderer as any}
          </Tree>
      </div>
      <SaveToLibraryModal />
      <PasteAtRootContextMenu parentContext={parentContext} setParentContext={setParentContext} />
    </div>
  );
};
