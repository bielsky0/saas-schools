/**
 * ============================================================================
 * USE BLOCK DRAG START HOOK
 * ============================================================================
 *
 * Hook that handles the start of a drag operation.
 * Initializes drag state, sets up the dragged block data, and prepares
 * the initial drop indicator for a smooth drag experience.
 *
 * @module use-block-drag-start
 */

import { useAtom } from "jotai";
import { pick } from "lodash-es";
import { DragEvent, useCallback, useRef } from "react";
import { cleanupDragImage, createCoreDragImage } from "~/core/components/canvas/dnd/drag-and-drop/create-drag-image";
import {
  dragAndDropAtom,
  dropIndicatorAtom,
  setIsDragging,
} from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { getOrientation } from "~/core/components/canvas/dnd/getOrientation";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBlockHighlight } from "~/hooks/use-block-highlight";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { ChaiBlock } from "~/types/common";

/**
 * @HOOK useBlockDragStart
 * @description
 * Handles the initialization of drag operations for blocks.
 *
 * Features:
 * - Stores dragged block data (type only for new blocks, full data for existing)
 * - Clears current selection and highlights
 * - Sets up invisible drag image for custom cursor
 * - Initializes drop indicator with default canvas state
 * - Publishes event to close add block panel
 *
 * @returns Function to call on drag start event
 *
 * @example
 * const onDragStart = useBlockDragStart();
 * <div onDragStart={(e) => onDragStart(e, block, true)} />
 */
export const useBlockDragStart = () => {
  const [, setSelectedBlockIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { clearHighlight } = useBlockHighlight();
  const [, setDraggedBlock] = useAtom(dragAndDropAtom);
  const [, setDropIndicator] = useAtom(dropIndicatorAtom);
  const dragImageRef = useRef<HTMLElement | null>(null);

  return useCallback(
    (e: DragEvent, _block: ChaiBlock, isAddNew: boolean = true) => {
      // Clean up any previous drag image
      if (dragImageRef.current) {
        cleanupDragImage(dragImageRef.current);
        dragImageRef.current = null;
      }

      // For new blocks, only store the type and blocks; for existing blocks, store the full block
      const block = (isAddNew ? pick(_block, ["type", "blocks", "partialBlockId"]) : _block) as ChaiBlock;

      // Store the dragged block in atom for access by other hooks
      setDraggedBlock(block);

      // Set up drag data transfer (required for drag/drop API)
      e.dataTransfer.setData("text/plain", JSON.stringify({ block }));
      e.dataTransfer.effectAllowed = "move";

      // Reduce height and opacity of tall dragging elements for visual feedback
      if (!isAddNew && _block._id) {
        const iframeDoc = (document.getElementById("canvas-iframe") as HTMLIFrameElement)?.contentDocument;
        if (iframeDoc) {
          const draggingElement = iframeDoc.querySelector(`[data-block-id="${_block._id}"]`) as HTMLElement;
          if (draggingElement) {
            // Use a small timeout to allow browser to capture drag image first
            setTimeout(() => {
              if (draggingElement) {
                const rect = draggingElement.getBoundingClientRect();
                const currentHeight = rect.height;
                // Check if parent has vertical orientation (flex-direction: column or default block flow)
                const orientation = getOrientation(draggingElement?.parentElement!);

                // If height > 200px and parent has vertical orientation, reduce height to 100px
                if (orientation === "vertical" && currentHeight > 200) {
                  // Force height to 100px by setting both height and max-height
                  draggingElement.style.height = "max-content";
                  draggingElement.style.maxHeight = "max-content";
                  draggingElement.style.minHeight = "0";
                  draggingElement.style.overflow = "hidden";
                  draggingElement.innerHTML =
                    "<div class='flex items-center justify-center w-full h-full outline-[1px] outline-dashed font-medium outline-gray-500 bg-gray-500/10 py-4 text-transparent'>-</div>";
                  draggingElement.style.opacity = "0.4";
                }
                // Reduce opacity for visual feedback
                draggingElement.style.opacity = "0.4";

                draggingElement.setAttribute("data-dragging", "true");
              }
            }, 0);
          }
        }
      }

      // Create custom drag image
      if (_block?._type || _block?.type) {
        // Core block with icon and label
        const dragImage = createCoreDragImage(_block);
        dragImageRef.current = dragImage;
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        // Clean up after a short delay to ensure drag has started
        setTimeout(() => {
          if (dragImageRef.current) {
            cleanupDragImage(dragImageRef.current);
            dragImageRef.current = null;
          }
        }, 50);
      }

      // Clear any existing selection and highlights
      setSelectedBlockIds([]);
      clearHighlight();
      setStyleBlocks([]);

      // Close the add block panel
      pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);

      // Set global dragging flag
      setIsDragging(true);

      // Initialize with a default valid drop indicator (canvas root)
      // This ensures there's always a valid drop position available
      setDropIndicator({
        isVisible: true,
        isValid: true,
        position: "inside",
        placeholderOrientation: "horizontal",
        isEmpty: true,
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        targetBlockId: "canvas",
        targetParentId: undefined,
      });
    },
    [setSelectedBlockIds, clearHighlight, setDraggedBlock, setDropIndicator],
  );
};
