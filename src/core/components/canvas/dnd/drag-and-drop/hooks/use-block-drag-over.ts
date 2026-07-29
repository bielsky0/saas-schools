/**
 * ============================================================================
 * USE BLOCK DRAG OVER HOOK
 * ============================================================================
 *
 * Hook that handles drag over events to provide real-time visual feedback.
 * Uses intelligent drop zone detection to show placeholders at the most
 * intuitive position based on pointer location and element structure.
 *
 * @module use-block-drag-over
 */

import { useAtom } from "jotai";
import { throttle } from "lodash-es";
import { DragEvent, useCallback, useEffect, useRef } from "react";
import { detectDropZone } from "~/core/components/canvas/dnd/drag-and-drop/drag-and-drop-utils";
import { isDraggingOnlyImageBlock } from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drop";
import {
  dragAndDropAtom,
  dropIndicatorAtom,
  isDragging,
} from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { useDragParentHighlight } from "~/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-parent-highlight";
import {
  canDropAsSiblingWithoutCircularReference,
  canDropWithoutCircularReference,
  isDescendantOf,
} from "~/core/components/canvas/dnd/drag-and-drop/prevent-circular-drop";
import { getOrientation } from "~/core/components/canvas/dnd/getOrientation";
import { canAcceptChildBlock } from "~/core/functions/block-helpers";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useCanvasIframe } from "~/hooks/use-canvas-iframe";

// Leaf block types that cannot accept children
const LEAF_BLOCK_TYPES = [
  "Heading",
  "Text",
  "Image",
  "Paragraph",
  "Icon",
  "Input",
  "Radio",
  "Checkbox",
  "Select",
  "CustomHTML",
  "TextArea",
  "Divider",
  "Repeater",
  "Video",
];

// Auto-scroll configuration
const AUTO_SCROLL_CONFIG = {
  /** Edge zone size in pixels where auto-scroll triggers */
  EDGE_ZONE: 50,
  /** Maximum scroll speed in pixels per frame */
  MAX_SCROLL_SPEED: 10,
  /** Minimum scroll speed in pixels per frame */
  MIN_SCROLL_SPEED: 10,
} as const;

/**
 * @HOOK useBlockDragOver
 * @description
 * Handles drag over events with intelligent drop zone detection and visual feedback.
 *
 * Features:
 * - Throttled event handling (300ms) for performance
 * - Intelligent drop zone detection based on pointer position
 * - Gap detection between elements
 * - Edge-based placement zones
 * - Parent edge proximity detection
 * - Leaf block protection (prevents dropping inside non-container blocks)
 * - Real-time placeholder updates
 * - Sticky placeholder (maintains last valid position)
 *
 * The hook uses the detectDropZone utility to calculate the best drop position
 * based on pointer coordinates, element orientation, and layout structure.
 *
 * @returns Function to call on drag over event
 *
 * @example
 * const onDragOver = useBlockDragOver();
 * <div onDragOver={onDragOver} />
 */
export const useBlockDragOver = () => {
  const [draggedBlock] = useAtom(dragAndDropAtom);
  const [iframe] = useCanvasIframe();
  const [, setDropIndicator] = useAtom(dropIndicatorAtom);
  const { clearParentHighlight, highlightParent } = useDragParentHighlight();
  const [allBlocks] = useBlocksStore();

  // Get the document from the iframe element
  const iframeDoc = (iframe as HTMLIFrameElement)?.contentDocument;

  // Auto-scroll state
  const autoScrollRef = useRef<number | null>(null);
  const lastPointerYRef = useRef<number>(0);

  /**
   * Handle auto-scrolling when dragging near edges
   */
  const handleAutoScroll = useCallback(
    (pointerY: number) => {
      if (!iframeDoc?.defaultView) return;

      const viewport = iframeDoc.defaultView;
      const viewportHeight = viewport.innerHeight;
      const scrollTop = viewport.scrollY;
      const documentHeight = iframeDoc.documentElement.scrollHeight;

      // Store pointer position for continuous scrolling
      lastPointerYRef.current = pointerY;

      // Calculate distance from edges
      const distanceFromTop = pointerY;
      const distanceFromBottom = viewportHeight - pointerY;

      // Determine if we should scroll and in which direction
      let shouldScroll = false;
      let scrollDirection: "up" | "down" | null = null;
      let edgeDistance = 0;

      if (distanceFromTop < AUTO_SCROLL_CONFIG.EDGE_ZONE && scrollTop > 0) {
        // Near top edge and can scroll up
        shouldScroll = true;
        scrollDirection = "up";
        edgeDistance = distanceFromTop;
      } else if (distanceFromBottom < AUTO_SCROLL_CONFIG.EDGE_ZONE && scrollTop + viewportHeight < documentHeight) {
        // Near bottom edge and can scroll down
        shouldScroll = true;
        scrollDirection = "down";
        edgeDistance = distanceFromBottom;
      }

      // Cancel existing animation if scrolling stopped
      if (!shouldScroll && autoScrollRef.current !== null) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
        return;
      }

      // Start or continue scrolling
      if (shouldScroll && scrollDirection) {
        // Calculate scroll speed based on proximity to edge
        // Closer to edge = faster scroll
        const proximityRatio = 1 - edgeDistance / AUTO_SCROLL_CONFIG.EDGE_ZONE;
        const scrollSpeed =
          AUTO_SCROLL_CONFIG.MIN_SCROLL_SPEED +
          (AUTO_SCROLL_CONFIG.MAX_SCROLL_SPEED - AUTO_SCROLL_CONFIG.MIN_SCROLL_SPEED) * proximityRatio;

        const scroll = () => {
          if (!isDragging || !viewport) {
            autoScrollRef.current = null;
            return;
          }

          // Perform the scroll
          const scrollAmount = scrollDirection === "up" ? -scrollSpeed : scrollSpeed;
          viewport.scrollBy(0, scrollAmount);

          // Check if we should continue scrolling
          const currentScrollTop = viewport.scrollY;
          const canScrollUp = currentScrollTop > 0;
          const canScrollDown = currentScrollTop + viewportHeight < documentHeight;

          // Recalculate distances with current pointer position
          const currentDistanceFromTop = lastPointerYRef.current;
          const currentDistanceFromBottom = viewportHeight - lastPointerYRef.current;

          const shouldContinue =
            (scrollDirection === "up" && canScrollUp && currentDistanceFromTop < AUTO_SCROLL_CONFIG.EDGE_ZONE) ||
            (scrollDirection === "down" && canScrollDown && currentDistanceFromBottom < AUTO_SCROLL_CONFIG.EDGE_ZONE);

          if (shouldContinue) {
            autoScrollRef.current = requestAnimationFrame(scroll);
          } else {
            autoScrollRef.current = null;
          }
        };

        // Start animation if not already running
        if (autoScrollRef.current === null) {
          autoScrollRef.current = requestAnimationFrame(scroll);
        }
      }
    },
    [iframeDoc],
  );

  // Cleanup auto-scroll on unmount or when dragging stops
  useEffect(() => {
    return () => {
      if (autoScrollRef.current !== null) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, []);

  // Stop auto-scroll when dragging ends
  useEffect(() => {
    if (!isDragging && autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, [isDragging]);

  const throttledHandler = useCallback(
    throttle((e: DragEvent) => {
      if (!isDragging) return;

      // Early return if no drag operation is active
      if (!draggedBlock) {
        return;
      }

      clearParentHighlight();

      const targetDetail = getTargetDetail(e);
      const { element, targetBlockId, targetParentId } = targetDetail;

      // If no valid target element, keep the last valid position (don't clear)
      if (!element || !targetBlockId) {
        return;
      }

      // CRITICAL: Get the dragged block ID early to check various conditions
      const draggedBlockId = draggedBlock._id;

      // CRITICAL: Prevent dropping on the dragged element itself or any of its descendants
      if (draggedBlockId) {
        // Check if target is the dragged block itself
        if (targetBlockId === draggedBlockId) {
          return; // Cannot drop on itself
        }

        // Check if target is a descendant of the dragged block
        if (isDescendantOf(targetBlockId, draggedBlockId, allBlocks)) {
          return; // Cannot drop on its own descendants
        }
      }

      // Get the dragged block type
      const draggedBlockType = draggedBlock._type || draggedBlock.type;
      if (!draggedBlockType) {
        return;
      }

      // Get pointer coordinates for intelligent drop zone detection
      const pointerX = e.clientX;
      const pointerY = e.clientY;

      // Handle auto-scrolling based on pointer position
      handleAutoScroll(pointerY);

      if (!iframeDoc) return;

      const dropZone = detectDropZone(element, pointerX, pointerY, draggedBlockType, iframeDoc);

      // If no valid drop zone found, keep the last valid position
      if (!dropZone) {
        return;
      }

      // Validate the drop zone
      const targetBlockType = element.getAttribute("data-block-type") || "Box";
      let isValid = false;

      // Check if target is a leaf block
      const isLeafBlock = LEAF_BLOCK_TYPES.includes(targetBlockType);

      if (targetBlockType === "Image" && draggedBlockType === "Image" && isDraggingOnlyImageBlock(draggedBlock)) {
        highlightParent(targetBlockId);
        setDropIndicator({
          isVisible: true,
          isValid: true,
          position: dropZone.position,
          placeholderOrientation: dropZone.placeholderOrientation,
          isEmpty: true,
          top: element.offsetTop,
          left: dropZone.rect.left,
          width: element.clientWidth,
          height: element.clientHeight,
          targetBlockId: dropZone.targetBlockId,
          targetParentId: dropZone.targetBlockId,
        });
        return;
      }

      if (dropZone.position === "inside") {
        // Leaf blocks cannot accept children
        if (isLeafBlock) {
          return;
        }

        // CRITICAL: Prevent circular reference - cannot drop a block inside itself or its descendants
        if (draggedBlockId && !canDropWithoutCircularReference(draggedBlockId, targetBlockId, allBlocks)) {
          // Silently reject - this would create a circular reference
          return;
        }

        isValid = canAcceptChildBlock(targetBlockType, draggedBlockType);
      } else {
        // For before/after, validate with parent
        let parentElement = element.parentElement;
        let parentBlockType = "Box";
        while (parentElement && !parentElement.hasAttribute("data-block-id")) {
          parentElement = parentElement.parentElement;
        }
        if (parentElement) {
          parentBlockType = parentElement.getAttribute("data-block-type") || "Box";
        }

        // CRITICAL: Prevent circular reference when dropping as sibling
        if (draggedBlockId && !canDropAsSiblingWithoutCircularReference(draggedBlockId, targetBlockId, allBlocks)) {
          // Silently reject - this would create a circular reference
          return;
        }

        isValid = canAcceptChildBlock(parentBlockType, draggedBlockType);
      }

      // If not valid, keep last position
      if (!isValid) {
        return;
      }

      highlightParent(dropZone.targetParentId);

      // Determine the final targetParentId to use
      // If dropZone has a targetParentId, use it; otherwise fall back to the one from getTargetDetail
      const finalTargetParentId = dropZone.targetParentId || targetParentId || undefined;

      // Update drop indicator state with the intelligent drop zone
      setDropIndicator({
        isVisible: true,
        isValid: true,
        position: dropZone.position,
        placeholderOrientation: dropZone.placeholderOrientation,
        isEmpty: dropZone.isEmpty ?? false,
        top: dropZone.rect.top,
        left: dropZone.rect.left,
        width: dropZone.rect.width,
        height: dropZone.rect.height,
        targetBlockId: dropZone.targetBlockId,
        targetParentId: finalTargetParentId,
      });

      // Set visual feedback on target element
      removeDropTargetAttributes(iframeDoc);
      dropZone.targetElement.setAttribute("data-drop-target", "true");
    }, 300),
    [iframeDoc, draggedBlock, setDropIndicator, clearParentHighlight, highlightParent, allBlocks, handleAutoScroll],
  );

  return useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      throttledHandler(e);
    },
    [throttledHandler],
  );
};

/**
 * @FUNCTION getTargetDetail
 * @description
 * Extracts detailed information about the drag target element.
 * Traverses up the DOM to find the nearest block element with data-block-id.
 *
 * @param e - The drag event
 * @returns Object containing element, IDs, types, and orientation
 */
function getTargetDetail(e: DragEvent) {
  let element = e.target as HTMLElement;

  // Find the nearest element with data-block-id
  while (element && !element.hasAttribute("data-block-id")) {
    element = element.parentElement as HTMLElement;
  }

  if (!element) {
    return {
      element: null,
      targetBlockId: null,
      targetBlockType: null,
      targetParentId: null,
      targetParentType: null,
      orientation: "vertical" as const,
    };
  }

  const targetBlockId = element.getAttribute("data-block-id");
  const targetBlockType = element.getAttribute("data-block-type") || "Box";

  // Find parent block
  let parentElement = element.parentElement;
  while (parentElement && !parentElement.hasAttribute("data-block-id")) {
    parentElement = parentElement.parentElement;
  }

  const targetParentId = parentElement?.getAttribute("data-block-id") || null;
  const targetParentType = parentElement?.getAttribute("data-block-type") || "Box";
  const orientation = getOrientation(element);

  return {
    element,
    targetBlockId,
    targetBlockType,
    targetParentId,
    targetParentType,
    orientation,
  };
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
