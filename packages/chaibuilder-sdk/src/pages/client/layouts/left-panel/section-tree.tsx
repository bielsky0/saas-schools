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
import { Node, TreeKind } from "~/core/components/sidepanels/panels/outline/node";
import { SaveToLibraryModal } from "~/core/components/sidepanels/panels/outline/upsert-library-block-modal";
import { PasteAtRootContextMenu } from "~/core/components/sidepanels/panels/outline/paste-into-root";
import { ROOT_TEMP_KEY } from "~/core/constants/STRINGS";
import { canAcceptChildBlock, canAddChildBlock } from "~/core/functions/block-helpers";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useCutBlockIds } from "~/hooks/use-cut-blockIds";
import { expandedIdsAtom } from "~/hooks/use-expand-tree";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { ChaiBlock } from "~/types/common";
import { SectionGroupId, SectionTreeNode } from "./section-groups";

interface SectionTreeProps {
  data: SectionTreeNode[];
  nodeRenderer?: React.ComponentType<NodeRendererProps<any>>;
  /**
   * "sections" → top-level rows are sections (delete, group icons, chevron always);
   * "blocks" → top-level rows are blocks (no delete, type icons);
   * "outline" → legacy outline behaviour (default).
   */
  treeKind?: TreeKind;
  /** Group role for section icons (header / template / footer). */
  groupRole?: SectionGroupId;
}

const ROW_HEIGHT = 30;
const TREE_PADDING = 8;

/** Top-level ancestor id of a block (its section). */
const getTopLevelId = (blocks: ChaiBlock[], id: string): string | undefined => {
  let current = find(blocks, { _id: id }) as ChaiBlock | undefined;
  let top: string | undefined = current?._id;
  while (current?._parent) {
    current = find(blocks, { _id: current._parent }) as ChaiBlock | undefined;
    top = current?._id;
  }
  return top;
};

const useCanMove = () => {
  const [blocks] = useBlocksStore();
  return (ids: string[], newParentId: string | null) => {
    const firstId = first(ids);
    const blockType = first(ids.map((id) => find(blocks, { _id: id })?._type));
    if (!blockType || !firstId) return false;
    const source = find(blocks, { _id: firstId }) as ChaiBlock | undefined;
    if (!newParentId) {
      // Root drop: only top-level nodes (sections) can be reordered at root;
      // blocks must never leave their section (Shopify §5.6).
      return !source?._parent;
    }
    const newParentType = find(blocks, { _id: newParentId });
    if (!newParentType) return false;
    if (!canAcceptChildBlock((newParentType as ChaiBlock)._type, blockType)) return false;
    // Blocks stay within their top-level section; sections stay at top level.
    return getTopLevelId(blocks, firstId) === getTopLevelId(blocks, newParentId);
  };
};

const filterOutCutBlocks = (data: SectionTreeNode[], cutIds: string[]): SectionTreeNode[] =>
  data
    .filter((node) => !cutIds.includes(node._id))
    .map((node) => ({
      ...node,
      children: node.children ? filterOutCutBlocks(node.children, cutIds) : [],
    }));

export const SectionTree = ({ data, nodeRenderer, treeKind = "sections", groupRole }: SectionTreeProps) => {
  const [ids, setIds] = useSelectedBlockIds();
  const [cutBlocksIds] = useCutBlockIds();
  const [expandedIds] = useAtom(expandedIdsAtom);
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
  const userCollapsedRef = useRef<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const filtered = filterOutCutBlocks(data, cutBlocksIds);
    // Prepend a Shopify-style "Add block" row as the first child of every node
    // that can accept children (sections and layout blocks).
    const appendAddRow = (nodes: SectionTreeNode[]): SectionTreeNode[] =>
      nodes.map((node) => {
        const children = node.children ? appendAddRow(node.children) : [];
        const withAdd = canAddChildBlock(node._type ?? "")
          ? [{ _type: ROOT_TEMP_KEY, _id: `__ADD_BLOCK_${node._id}`, children: [] }, ...children]
          : children;
        return { ...node, children: withAdd };
      });
    return appendAddRow(filtered);
  }, [data, cutBlocksIds]);

  const syncHeight = useCallback(() => {
    const visible = treeRef.current?.visibleNodes?.length;
    if (visible) setTreeHeight(visible * ROW_HEIGHT + TREE_PADDING);
  }, []);

  useEffect(() => {
    syncHeight();
  }, [treeData, syncHeight]);

  // Shopify: sections are expanded by default and stay expanded until the user
  // explicitly collapses them (tracked in `userCollapsedRef`).
  useEffect(() => {
    const t = treeRef.current;
    if (!t) return;
    treeData.forEach((node) => {
      const n = t.get(node._id);
      if (n?.children?.length && !n.isOpen && !userCollapsedRef.current.has(node._id)) {
        t.open(node._id);
      }
    });
  }, [treeData]);

  // Reveal the selected block: expand the path to it (from useExpandTree).
  useEffect(() => {
    const t = treeRef.current;
    if (!t) return;
    expandedIds.forEach((id) => {
      const n = t.get(id);
      if (n?.children?.length && !n.isOpen) t.open(id);
    });
  }, [expandedIds]);

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
      const dragId = dragNodes?.[0]?.id;
      const disabled = !dragNodes?.length
        ? false
        : parentNode?.data._type === ROOT_TEMP_KEY || !canMove([dragId], parentNode?.id ?? null);
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

  const RenderNode = useCallback(
    (props: NodeRendererProps<any>) => (
      <NodeRenderer {...(props as any)} treeKind={treeKind} groupRole={groupRole} />
    ),
    [NodeRenderer, treeKind, groupRole],
  );

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
            onToggle={(id) => {
              const n = treeRef.current?.get(id);
              if (n?.isOpen) userCollapsedRef.current.delete(id);
              else userCollapsedRef.current.add(id);
              setTimeout(syncHeight, 0);
            }}
            data={treeData}
            renderCursor={DefaultCursor}
            onSelect={onSelect}
            childrenAccessor={(d: any) => d.children}
            width={"100%"}
            rowHeight={30}
            renderDragPreview={() => null}
            indent={28}
            onContextMenu={onContextMenu}
            disableDrop={debouncedDisableDrop as any}
            idAccessor={"_id"}>
            {RenderNode as any}
          </Tree>
      </div>
      <SaveToLibraryModal />
      <PasteAtRootContextMenu parentContext={parentContext} setParentContext={setParentContext} />
    </div>
  );
};