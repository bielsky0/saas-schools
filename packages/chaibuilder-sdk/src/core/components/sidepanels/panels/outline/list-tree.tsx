import {
  CardStackIcon,
  DotsVerticalIcon,
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
  PlusIcon,
  StackIcon,
} from "@radix-ui/react-icons";
import { useDebouncedCallback } from "@react-hookz/web";
import { useAtom } from "jotai";
import { find, first, isEmpty } from "lodash-es";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { MoveHandler, RenameHandler, Tree, TreeApi } from "react-arborist";
import { useTranslation } from "react-i18next";
import { treeDSBlocks } from "~/atoms/blocks";
import { treeRefAtom } from "~/atoms/ui";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
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
import { PERMISSIONS } from "~/core/constants/PERMISSIONS";
import { ROOT_TEMP_KEY } from "~/core/constants/STRINGS";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { canAcceptChildBlock } from "~/core/functions/block-helpers";
import { cn } from "~/core/functions/common-functions";
import { pubsub } from "~/core/pubsub";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useCutBlockIds } from "~/hooks/use-cut-blockIds";
import { usePermissions } from "~/hooks/use-permissions";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { ChaiBlock } from "~/types/common";
import { BlockMoreOptions } from "./block-more-options";
import { PasteAtRootContextMenu } from "./paste-into-root";

const useCanMove = () => {
  const [blocks] = useBlocksStore();
  return (ids: string[], newParentId: string | null) => {
    if (!newParentId) {
      // Root level drop — any block can be dropped here
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

const ListTree = () => {
  const [treeData] = useAtom(treeDSBlocks);
  const [ids, setIds] = useSelectedBlockIds();
  const [cutBlocksIds] = useCutBlockIds();
  const updateBlockProps = useUpdateBlocksProps();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { moveBlocks } = useBlocksStoreUndoableActions();
  const canMove = useCanMove();
  const treeRef = useRef<TreeApi<any>>(null);
  const [, setTreeRef] = useAtom(treeRefAtom);
  const { t } = useTranslation();
  const [parentContext, setParentContext] = useState<{ x: number; y: number } | null>(null);
  const clearSelection = () => {
    setIds([]);
    setStyleBlocks([]);
  };

  const filteredTreeData = useMemo(() => {
    const filterTreeData = (data: any[], cutIds: string[]): any[] => {
      return data
        .filter((node) => !cutIds.includes(node._id))
        .map((node) => ({
          ...node,
          children: node.children ? filterTreeData(node.children, cutIds) : [],
        }));
    };
    const nodes = filterTreeData(treeData, cutBlocksIds);
    return [...nodes, { _type: ROOT_TEMP_KEY, _id: ROOT_TEMP_KEY, children: [] }];
  }, [treeData, cutBlocksIds]);

  const onRename: RenameHandler<any> = ({ id, name, node }) => {
    updateBlockProps([id], { _name: name }, node.data._name);
  };
  const onMove: MoveHandler<any> = ({ dragIds, parentId, index }) => {
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
      return (
        parentNode?.data._type === ROOT_TEMP_KEY ||
        !canAcceptChildBlock(parentNode?.data._type, dragNodes[0]?.data._type)
      );
    },
    [],
    300,
  );

  const evaluateCondition = (condition: string, selectedNode: any): boolean => {
    if (!condition) return true;

    // Create a safe evaluation context with only the variables we need
    const context = {
      isLeaf: !selectedNode.isInternal,
      isClosed: !selectedNode.isOpen,
      isOpen: selectedNode.isOpen,
    };

    // Simple condition evaluator that supports basic boolean logic
    try {
      // Replace variables with their actual values
      let evalCondition = condition;
      (Object.keys(context) as Array<keyof typeof context>).forEach((key) => {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        evalCondition = evalCondition.replace(regex, String(context[key]));
      });

      // Use Function constructor instead of eval for better security
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
    //sets the ref once on mount if its available
    updateTreeRef();

    /**Sets up a MutationObserver to watch for DOM changes and try setting the ref again */
    const observer = new MutationObserver(updateTreeRef);
    observer.observe(document.body, { childList: true, subtree: true });

    //disconnect observer on unmount
    return () => observer.disconnect();
  }, [setTreeRef]);

  const { hasPermission } = usePermissions();

  if (isEmpty(treeData))
    return (
      <div>
        <div className="mt-10 flex h-full w-full items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="rounded-full bg-muted p-6">
              <StackIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{t("This page is empty")}</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("Get started by adding your first block to begin building your page")}
              </p>
            </div>
            {hasPermission(PERMISSIONS.ADD_BLOCK) && (
              <Button
                onClick={() => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK)}
                className="bg-primary shadow-sm hover:bg-primary/90"
                size="sm">
                <PlusIcon className="h-4 w-4" />
                {t("Add Block")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );

  return (
    <>
      <div
        className={cn("chai-outline group/parent parent-group flex h-full select-none flex-col space-y-1")}
        onClick={() => clearSelection()}>
        <div
          id="outline-view "
          className="no-scrollbar h-full overflow-y-auto text-sm"
          onKeyDown={(e) => {
            if (treeRef.current && !treeRef.current.isEditing) {
              handleKeyDown(e as unknown as KeyboardEvent);
            }
          }}>
          <div className="mb-2 flex items-center justify-end gap-x-1 pb-2 text-sm text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="h-fit p-1" onClick={() => treeRef?.current?.openAll()} variant="ghost" size="sm">
                  <DoubleArrowDownIcon className="h-2 w-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="isolate z-[9999]">{t("Expand all")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="h-fit p-1" onClick={() => treeRef?.current?.closeAll()} variant="ghost" size="sm">
                  <DoubleArrowUpIcon className="h-2 w-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="isolate z-[9999]">{t("Collapse all")}</TooltipContent>
            </Tooltip>
          </div>
          <div className="group relative z-30 ml-5 w-full cursor-pointer">
            <div
              onClick={() => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, { position: 0 })}
              className="h-1 w-[90%] rounded bg-primary opacity-0 duration-200 group-hover:opacity-100">
              <div className="absolute left-[45%] top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full bg-primary p-1 outline outline-2 outline-white hover:bg-primary">
                <PlusIcon className="h-3 w-3 stroke-[3] text-white" />
              </div>
            </div>
          </div>
          <div>
            <div
              role="treeitem"
              aria-level={0}
              aria-selected={true}
              aria-expanded={false}
              onClick={() => setIds([])}
              className="flex min-h-[25px] items-center">
              <div
                className={cn(
                  "group flex h-[25px] w-full cursor-pointer items-center justify-between space-x-px px-2 py-0 outline-none",
                  ids.length === 0 ? "bg-[#005BD3] text-white" : "",
                )}>
                <div className="leading-1 flex items-center">
                  <CardStackIcon className="h-3 w-3 flex-shrink-0 rotate-180" />
                  <div className="ml-1.5 flex items-center gap-x-1 truncate text-[13px]">Body</div>
                </div>

                <BlockMoreOptions node={"BODY"} id={"BODY"}>
                  <div className="hidden cursor-pointer rounded bg-transparent p-px hover:bg-primary/10 group-hover:block">
                    <DotsVerticalIcon className="h-3 w-3" />
                  </div>
                </BlockMoreOptions>
              </div>
            </div>
          </div>
          <Tree
            ref={treeRef}
            height={window.innerHeight - 160}
            className="no-scrollbar !h-full max-w-full !overflow-y-auto !overflow-x-hidden"
            rowClassName="flex items-center h-full"
            selection={ids[0] || ""}
            onRename={onRename}
            openByDefault={false}
            onMove={onMove}
            data={[...filteredTreeData]}
            renderCursor={DefaultCursor}
            onSelect={onSelect}
            childrenAccessor={(d: any) => d.children}
            width={"100%"}
            rowHeight={25}
            renderDragPreview={() => null}
            indent={14}
            onContextMenu={onContextMenu}
            disableDrop={debouncedDisableDrop as any}
            idAccessor={"_id"}>
            {Node as any}
          </Tree>
        </div>
      </div>
      <SaveToLibraryModal />
      <PasteAtRootContextMenu parentContext={parentContext} setParentContext={setParentContext} />
    </>
  );
};

export default ListTree;
