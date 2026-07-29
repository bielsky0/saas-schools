import { flip, limitShift, size } from "@floating-ui/dom";
import { shift, useFloating } from "@floating-ui/react-dom";
import { ArrowUpIcon, CopyIcon, DragHandleDots2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { useResizeObserver } from "@react-hookz/web";
import { first, get, isEmpty } from "lodash-es";
import { useEffect, useState } from "react";
import { AiIcon } from "~/core/components/ai/ai-icon";
import AddBlockDropdown from "~/core/components/canvas/add-block-placements";
import { useDragAndDrop, useIsDragAndDropEnabled } from "~/core/components/canvas/dnd/drag-and-drop/hooks";
import BlockController from "~/core/components/sidepanels/panels/add-blocks/block-controller";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { useFrame } from "~/core/frame/frame-context";
import { canDeleteBlock, canDuplicateBlock } from "~/core/functions/block-helpers";
import { PERMISSIONS } from "~/core/main";
import { pubsub } from "~/core/pubsub";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useDuplicateBlocks } from "~/hooks/use-duplicate-blocks";
import { useHighlightBlockId } from "~/hooks/use-highlight-blockId";
import { useInlineEditing } from "~/hooks/use-inline-editing";
import { usePermissions } from "~/hooks/use-permissions";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useSidebarActivePanel } from "~/hooks/use-sidebar-active-panel";
import { ChaiBlock } from "~/types/common";
import { GotoSettingsIcon } from "./goto-settings-icon";
import { getElementByDataBlockId } from "./static/chai-canvas";

type BlockActionProps = {
  block: ChaiBlock;
  isDragging: boolean;
  selectedBlockElement: HTMLElement;
};
const getElementByStyleId = (doc: any, styleId: string): HTMLElement =>
  doc.querySelector(`[data-style-id="${styleId}"]`) as HTMLElement;

export const BlockSelectionHighlighter = () => {
  const selectedBlock = useSelectedBlock();
  const { document } = useFrame();
  const [stylingBlocks] = useSelectedStylingBlocks();
  const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([]);
  const [, setSelectedStyleElements] = useState<HTMLElement[] | null[]>([]);
  const { onDragStart, onDragEnd, isDragging } = useDragAndDrop();
  const [dragging, setDragging] = useState<HTMLElement | null>(null);
  const isDragAndDropEnabled = useIsDragAndDropEnabled();

  const isInViewport = (element: HTMLElement, offset = 0) => {
    const { top } = element.getBoundingClientRect();
    return top + offset >= 0 && top - offset <= window.innerHeight;
  };

  useEffect(() => {
    if (!selectedBlock?._id) return;

    if (selectedBlock.type !== "Multiple" && document) {
      const blockElement = getElementByDataBlockId(document, selectedBlock._id);
      if (blockElement) {
        if (!isInViewport(blockElement)) {
          document.defaultView?.scrollTo({ top: blockElement.offsetTop, behavior: "smooth" });
        }
        setSelectedElements([blockElement]);
      }
    }
  }, [selectedBlock?._id, selectedBlock?.type, document]);

  useEffect(() => {
    if (!isEmpty(stylingBlocks) && document) {
      const selectedStyleElement = getElementByStyleId(document, (first(stylingBlocks) as { id: string }).id);
      if (selectedStyleElement) {
        setSelectedStyleElements([selectedStyleElement]);
      } else {
        setSelectedStyleElements([null]);
      }
    } else {
      setSelectedStyleElements([null]);
    }
  }, [stylingBlocks, document]);

  return (
    <div
      onDragEnd={() => {
        setDragging(null);
        onDragEnd();
      }}
      draggable={isDragAndDropEnabled && Boolean(selectedBlock)}
      onDragStart={(e: any) => {
        setDragging(selectedElements?.[0]);
        onDragStart(e, selectedBlock, false);
      }}>
      {selectedBlock && (
        <BlockFloatingSelector
          block={selectedBlock as ChaiBlock}
          isDragging={isDragging && Boolean(dragging)}
          selectedBlockElement={selectedElements[0] || (isDragging ? dragging : null)}
        />
      )}
    </div>
  );
};

const BlockFloatingSelector = ({ block, isDragging, selectedBlockElement }: BlockActionProps) => {
  const removeBlock = useRemoveBlocks();
  const duplicateBlock = useDuplicateBlocks();
  const [, setSelectedIds] = useSelectedBlockIds();
  const [, setHighlighted] = useHighlightBlockId();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { hasPermission } = usePermissions();
  const { editingBlockId } = useInlineEditing();
  const { document } = useFrame();
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
  const gotoSettingsEnabled = useBuilderProp("flags.gotoSettings", false);
  const isAiEnabled = useBuilderProp("flags.ai", false);

  // * Floating element position and size
  const { floatingStyles, refs, update } = useFloating({
    placement: "top-start",
    middleware: [
      shift({
        boundary: document?.body,
        limiter: limitShift({
          offset: 8,
          mainAxis: true,
          crossAxis: true,
        }),
      }),
      flip({
        boundary: document?.body,
        fallbackPlacements: ["bottom-start", "top-end", "bottom-end", "inside"] as any,
      }),
      size({
        boundary: document?.body,
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.max(200, availableWidth)}px`,
            maxHeight: `${Math.max(100, availableHeight)}px`,
          });
        },
      }),
    ],
    elements: { reference: selectedBlockElement },
  });

  useResizeObserver(selectedBlockElement as HTMLElement, () => update(), selectedBlockElement !== null);
  useResizeObserver(document?.body as HTMLElement, () => update(), document?.body !== null);

  const parentId: string | undefined | null = get(block, "_parent", null);

  const label: string = isEmpty(get(block, "_name", "")) ? get(block, "_type", "") : get(block, "_name", "");

  // * Updating position of floating element when selected block element changes
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (selectedBlockElement) {
      timer = setTimeout(() => update(), 500);
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      update();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedBlockElement, block?._id]);

  const [, setActivePanel] = useSidebarActivePanel();
  if (!isDragging && (!selectedBlockElement || !block || editingBlockId)) return null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        ref={refs.setFloating}
        style={floatingStyles}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setHighlighted("");
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={`isolate z-[999] flex h-6 items-center justify-between bg-blue-500 py-2 text-xs text-white ${isDragging ? "opacity-0" : ""}`}>
        <>
          <div className="flex items-center">
            {isDragAndDropEnabled && (
              <DragHandleDots2Icon className="flex-shrink-0 cursor-grab rounded p-0.5 hover:bg-white/20 active:cursor-grabbing" />
            )}
            {parentId && (
              <ArrowUpIcon
                className="flex-shrink-0 rounded p-0.5 hover:bg-white/20"
                onClick={() => {
                  setStyleBlocks([]);
                  setSelectedIds([parentId]);
                }}
              />
            )}
          </div>

          <div className={`w-full ${isDragAndDropEnabled ? "cursor-grab active:cursor-grabbing" : ""}`}>
            <div className="mr-10 w-full items-center space-x-1 px-1 leading-tight">{label}</div>
          </div>
          <div className="flex items-center gap-1 pl-1 pr-1.5">
            {hasPermission(PERMISSIONS.ADD_BLOCK) && isAiEnabled && (
              <AiIcon
                className="h-4 w-4 rounded hover:bg-white hover:text-blue-500"
                onClick={() => {
                  setActivePanel("chai-chat-panel");
                  pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_AI_PANEL);
                }}
              />
            )}
            {gotoSettingsEnabled && (
              <GotoSettingsIcon
                blockId={block?._id}
                className="h-4 w-4 rounded p-px hover:bg-white hover:text-blue-500"
              />
            )}
            {!isDragAndDropEnabled && (
              <AddBlockDropdown block={block}>
                <PlusIcon className="h-4 w-4 rounded p-px hover:bg-white hover:text-blue-500" />
              </AddBlockDropdown>
            )}
            {canDuplicateBlock(get(block, "_type", "")) && hasPermission(PERMISSIONS.ADD_BLOCK) ? (
              <CopyIcon
                className="h-4 w-4 rounded p-px hover:bg-white hover:text-blue-500"
                onClick={() => duplicateBlock([block?._id])}
              />
            ) : null}
            {canDeleteBlock(get(block, "_type", "")) && hasPermission(PERMISSIONS.DELETE_BLOCK) ? (
              <TrashIcon
                className="h-4 w-4 rounded p-px hover:bg-white hover:text-blue-500"
                onClick={() => removeBlock([block?._id])}
              />
            ) : null}

            {hasPermission(PERMISSIONS.MOVE_BLOCK) && <BlockController block={block} updateFloatingBar={update} />}
          </div>
        </>
      </div>
    </>
  );
};
