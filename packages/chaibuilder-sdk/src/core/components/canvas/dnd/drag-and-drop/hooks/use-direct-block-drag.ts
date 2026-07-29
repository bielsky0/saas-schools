/**
 * ============================================================================
 * USE DIRECT BLOCK DRAG HOOK
 * ============================================================================
 *
 * Hook that enables direct click-and-drag functionality for blocks in the canvas.
 * Users can click and hold any block to immediately start dragging without
 * needing to select it first or use the floating action toolbar.
 *
 * @module use-direct-block-drag
 */

import { useAtom } from "jotai";
import { find } from "lodash-es";
import { useCallback, useRef } from "react";
import { clickCountAtom, lastClickTimeAtom } from "~/atoms/click-detection";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useDragAndDrop } from ".";

interface DirectDragHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * @HOOK useDirectBlockDrag
 * @description
 * Enables direct click-and-drag functionality for canvas blocks.
 * Automatically selects the block and initiates drag on mousedown + movement.
 *
 * Features:
 * - Detects mousedown on block
 * - Automatically selects the block
 * - Initiates drag on slight mouse movement
 * - Provides smooth transition from click to drag
 * - Works with existing drag-and-drop system
 *
 * @param block - The ChaiBlock to enable direct dragging for
 * @param enabled - Whether direct dragging is enabled (default: true)
 * @returns Object with mouseDown and dragStart handlers
 *
 * @example
 * const { onMouseDown, onDragStart } = useDirectBlockDrag(block);
 * <div onMouseDown={onMouseDown} onDragStart={onDragStart} draggable />
 */
export const useDirectBlockDrag = (): DirectDragHandlers => {
  const [, setSelectedBlockIds] = useSelectedBlockIds();
  const { onDragStart, onDragEnd } = useDragAndDrop();
  const [allBlocks] = useBlocksStore();
  const dragBlockIdRef = useRef<string | null>(null);
  const [lastClickTime, setLastClickTime] = useAtom(lastClickTimeAtom);
  const [clickCount, setClickCount] = useAtom(clickCountAtom);

  /**
   * Handle mousedown - prepare for potential drag
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime;
      if (timeSinceLastClick < 400 && timeSinceLastClick > 0) {
        setClickCount(2);
        return;
      }
      setLastClickTime(currentTime);

      const target = e.target as HTMLElement;

      // Check if clicking on a child block (let child handle it)
      const clickedBlockId = target.closest("[data-block-id]")?.getAttribute("data-block-id");
      if (!clickedBlockId) return;

      // Select this block immediately on mousedown
      setSelectedBlockIds([clickedBlockId]);
      dragBlockIdRef.current = clickedBlockId;
    },
    [setSelectedBlockIds, lastClickTime, setLastClickTime, clickCount, setClickCount],
  );

  /**
   * Handle dragstart - initiate the drag operation
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!dragBlockIdRef.current) return;

      const selectedBlock = find(allBlocks, { _id: dragBlockIdRef.current });
      if (selectedBlock) {
        onDragStart(e, selectedBlock, false);
      }
    },
    [allBlocks, onDragStart],
  );

  /**
   * Handle dragend - terminate the drag operation
   */
  const handleDragEnd = useCallback(() => {
    onDragEnd();
    dragBlockIdRef.current = null;
  }, [onDragEnd]);

  return {
    onMouseDown: handleMouseDown,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  };
};
