/**
 * ============================================================================
 * USE BLOCK DROP HOOK
 * ============================================================================
 *
 * Hook that handles the actual drop operation when a dragged block is released.
 * Calculates the correct insertion point and adds the block to the canvas
 * at the position indicated by the placeholder.
 *
 * @module use-block-drop
 */

import { useAtom } from "jotai";
import { filter, find, get, has, isFunction } from "lodash-es";
import { DragEvent, useCallback } from "react";
import { toast } from "sonner";
import {
  canvasRenderKeyAtom,
  dragAndDropAtom,
  dropIndicatorAtom,
  setIsDragging,
} from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { useDragParentHighlight } from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-parent-highlight";
import { useBlocksStore, useBlocksStoreUndoableActions } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { useBlockHighlight } from "~/hooks/use-block-highlight";
import { useCanvasIframe } from "~/hooks/use-canvas-iframe";
import { useCheckPartialCanAdd } from "~/hooks/use-partial-blocks-store";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import { syncBlocksWithDefaultProps } from "~/runtime";
import { ChaiBlock } from "~/types/common";

/**
 * @HOOK useBlockDrop
 * @description
 * Handles the drop event when a dragged block is released.
 *
 * Features:
 * - Validates drop state and dragged block
 * - Calculates precise insertion index based on drop indicator
 * - Handles both new blocks (type only) and predefined blocks (with children)
 * - Supports moving existing blocks to new positions (reordering/reparenting)
 * - Supports root-level and nested insertions
 * - Immediately clears drag state to prevent race conditions
 * - Syncs block defaults for predefined blocks
 *
 * The insertion logic uses the drop indicator state (set during dragOver)
 * to ensure the block is added/moved exactly where the placeholder was shown.
 *
 * For existing blocks (with _id), uses moveBlocks() to reposition.
 * For new blocks (without _id), uses addCoreBlock() to create.
 *
 * @returns Function to call on drop event
 *
 * @example
 * const onDrop = useBlockDrop();
 * <div onDrop={onDrop} />
 */
export const useBlockDrop = () => {
  const [draggedBlock, setDraggedBlock] = useAtom(dragAndDropAtom);
  const [dropIndicator, setDropIndicator] = useAtom(dropIndicatorAtom);
  const [allBlocks] = useBlocksStore();
  const [iframe] = useCanvasIframe();
  const { addCoreBlock } = useAddBlock();
  const { moveBlocks } = useBlocksStoreUndoableActions();
  const [, setSelectedBlockIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { clearHighlight } = useBlockHighlight();
  const { clearParentHighlight } = useDragParentHighlight();
  const [renderKey, setRenderKey] = useAtom(canvasRenderKeyAtom);
  const updateContent = useUpdateBlocksProps();
  const checkPartialCanAdd = useCheckPartialCanAdd();

  // Get the document from the iframe element
  const iframeDoc = (iframe as HTMLIFrameElement)?.contentDocument;

  return useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // CRITICAL: Set isDragging to false immediately to prevent any subsequent dragOver events
      setIsDragging(false);

      // Restore dragged element styles immediately
      restoreDraggedElementStyles(iframeDoc);

      // Immediate cleanup to prevent race conditions with dragOver
      removeDropTargetAttributes(iframeDoc);

      // Clear parent highlight and drop indicator immediately
      clearParentHighlight();
      setDropIndicator({
        isVisible: false,
        isValid: false,
        position: "inside",
        placeholderOrientation: "horizontal",
        isEmpty: false,
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      });

      // Additional cleanup after a short delay to catch any lingering state
      setTimeout(() => {
        clearParentHighlight();
        removeDropTargetAttributes(iframeDoc);
        setDropIndicator({
          isVisible: false,
          isValid: false,
          position: "inside",
          placeholderOrientation: "horizontal",
          isEmpty: false,
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        });
      }, 50);

      // Validate drop state
      if (!draggedBlock) {
        return;
      }

      // Since we maintain the last valid position, this should always be valid
      if (!dropIndicator.isValid || !dropIndicator.targetBlockId) {
        clearParentHighlight();
        return;
      }

      // Immediately clear dragged block to prevent subsequent dragover events
      // @ts-ignore
      setDraggedBlock(null);

      // Use targetBlockId and targetParentId from dropIndicator state
      // These were calculated during dragOver and match the placeholder position
      const targetBlockId = dropIndicator.targetBlockId;
      const targetParentId = dropIndicator.targetParentId;

      if (!targetBlockId) {
        return;
      }

      // Calculate insertion point using the drop indicator's target information
      const { parentId, index, replaceImageUrl } = calculateInsertionIndex(
        allBlocks,
        targetBlockId,
        targetParentId,
        dropIndicator.position,
        draggedBlock,
      );

      // Check if this is an existing block being moved or a new block being added
      const isExistingBlock = draggedBlock._id !== undefined;

      if (replaceImageUrl && isDraggingOnlyImageBlock(draggedBlock)) {
        updateContent([targetBlockId], { image: get(draggedBlock, "blocks.0.image") });
        setTimeout(() => {
          setRenderKey(renderKey + 1);
        }, 50);
        return;
      }

      if (isExistingBlock) {
        // Move existing block to new position
        moveBlocks([draggedBlock._id], parentId === null ? undefined : parentId, index);
        clearHighlight();
        setStyleBlocks([]);
        setSelectedBlockIds([draggedBlock._id]);
      } else {
        // Add new block
        const draggedBlockType = draggedBlock._type || draggedBlock.type;

        // Handle predefined blocks with children
        const preBlocks = !draggedBlock?.blocks
          ? null
          : isFunction(draggedBlock?.blocks)
            ? syncBlocksWithDefaultProps(draggedBlock?.blocks())
            : draggedBlock?.blocks;

        if (draggedBlockType === "PartialBlock") {
          // Check for circular dependency before adding
          const partialBlockId = draggedBlock.partialBlockId || "";
          const { canAdd, reason } = checkPartialCanAdd(partialBlockId);
          if (!canAdd) {
            toast.error(reason || "Cannot add this partial block");
            return;
          }
          addCoreBlock(
            {
              blocks: [{ _type: draggedBlockType, _id: "partial-block", partialBlockId: draggedBlock.partialBlockId }],
            },
            parentId,
            index,
          );
        } else {
          addCoreBlock(
            preBlocks?.length > 0 ? { blocks: [...preBlocks] } : { type: draggedBlockType },
            parentId,
            index,
          );
        }
      }

      // Force re-render of canvas by incrementing render key
      setTimeout(() => {
        setRenderKey(renderKey + 1);
      }, 50);
    },
    [
      draggedBlock,
      dropIndicator,
      allBlocks,
      iframeDoc,
      addCoreBlock,
      moveBlocks,
      setDraggedBlock,
      setDropIndicator,
      clearParentHighlight,
      clearHighlight,
      setSelectedBlockIds,
      setStyleBlocks,
      renderKey,
      setRenderKey,
      updateContent,
      checkPartialCanAdd,
    ],
  );
};

export const isDraggingOnlyImageBlock = (draggedBlock: any) => {
  const hasBlocks = has(draggedBlock, "blocks");
  const blocks = draggedBlock?.blocks as ChaiBlock[];
  const isOnlyImageBlock = blocks?.length === 1 && blocks?.[0]?._type === "Image";
  const notHasId = !blocks?.[0]?._id;
  return hasBlocks && isOnlyImageBlock && notHasId;
};

/**
 * @FUNCTION calculateInsertionIndex
 * @description
 * Calculates the parent ID and index where a new block should be inserted.
 *
 * Logic:
 * - "inside": Insert as last child of target block
 * - "before": Insert as sibling before target block
 * - "after": Insert as sibling after target block
 * - Special handling for canvas root drops
 * - Converts "canvas" parent ID to null for root-level insertions
 *
 * @param blocks - All blocks in the canvas
 * @param targetBlockId - The ID of the target block (where placeholder is shown)
 * @param targetParentId - The ID of the target's parent block
 * @param position - Where to insert relative to target
 * @returns Object with parentId and index for insertion
 */
function calculateInsertionIndex(
  blocks: ChaiBlock[],
  targetBlockId: string,
  targetParentId: string | undefined,
  position: "before" | "after" | "inside",
  draggedBlock: ChaiBlock,
): { parentId: string | null | undefined; index: number; replaceImageUrl?: boolean } {
  try {
    if (
      targetBlockId === targetParentId &&
      draggedBlock?.blocks?.length === 1 &&
      get(draggedBlock, "blocks.0._type") === "Image"
    ) {
      const targetBlockType = find(blocks, { _id: targetBlockId })?._type;
      if (targetBlockType === "Image") {
        return { parentId: "", index: -1, replaceImageUrl: true };
      }
    }

    // Special case: dropping on canvas root (empty canvas or inside canvas)
    if (targetBlockId === "canvas" || (position === "inside" && targetBlockId === "canvas")) {
      // Insert at the end of root-level blocks
      const rootBlocks = filter(blocks, (b) => !b?._parent);
      return {
        parentId: null, // null for root/canvas
        index: rootBlocks.length,
      };
    }

    if (position === "inside") {
      // Insert as child of target block (at the end)
      const children = filter(blocks, { _parent: targetBlockId });
      return {
        parentId: targetBlockId,
        index: children.length,
      };
    }

    // For 'before' and 'after', insert as sibling of target block
    // Check if this is a root-level insertion (targetParentId is null, undefined, or "canvas")
    const isRootLevel = !targetParentId || targetParentId === "canvas";
    const parentIdForFilter = isRootLevel ? undefined : targetParentId;
    const siblings = filter(blocks, (b) => (isRootLevel ? !b?._parent : b?._parent === parentIdForFilter));
    const targetIndex = siblings.findIndex((block) => block._id === targetBlockId);

    if (targetIndex === -1) {
      // Target not found in siblings - insert at end
      return {
        parentId: isRootLevel ? null : targetParentId,
        index: siblings.length,
      };
    }

    const calculatedIndex = position === "before" ? targetIndex : targetIndex + 1;

    return {
      parentId: isRootLevel ? null : targetParentId,
      index: calculatedIndex,
    };
  } catch {
    // Fallback: insert at root level at the end
    const rootBlocks = filter(blocks, (b) => !b?._parent);
    return {
      parentId: null,
      index: rootBlocks.length,
    };
  }
}

/**
 * @FUNCTION removeDropTargetAttributes
 * @description
 * Removes the data-drop-target attribute from all elements in the iframe.
 * This clears any visual feedback that was applied during drag operations.
 *
 * @param iframeDoc - The iframe document containing the canvas
 */
function removeDropTargetAttributes(iframeDoc: Document | null | undefined) {
  if (!iframeDoc) return;

  const elements = iframeDoc.querySelectorAll("[data-drop-target]");
  elements.forEach((el) => el.removeAttribute("data-drop-target"));
}

/**
 * @FUNCTION restoreDraggedElementStyles
 * @description
 * Cleans up dragging attributes. Re-render will restore proper element state.
 *
 * @param iframeDoc - The iframe document containing the canvas
 */
function restoreDraggedElementStyles(iframeDoc: Document | null | undefined) {
  if (!iframeDoc) return;

  const draggingElements = iframeDoc.querySelectorAll("[data-dragging]");
  draggingElements.forEach((el) => {
    el.removeAttribute("data-dragging");
  });
}
