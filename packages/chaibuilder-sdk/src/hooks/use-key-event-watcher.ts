import { get, isEmpty } from "lodash-es";
import { useHotkeys } from "react-hotkeys-hook";
import { canDeleteBlock } from "~/core/functions/block-helpers";
import { undoManager, useUndoManager } from "~/hooks/history/use-undo-manager";
import { useCopyBlocks as useCopyBlockIds } from "~/hooks/use-copy-blockIds";
import { useCutBlockIds } from "~/hooks/use-cut-blockIds";
import { useDuplicateBlocks } from "~/hooks/use-duplicate-blocks";
import { usePasteBlocks } from "~/hooks/use-paste-blocks";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";
import { useSavePage } from "~/hooks/use-save-page";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";

export const useKeyEventWatcher = (doc?: Document) => {
  const [ids, setIds] = useSelectedBlockIds();
  const selectedBlock = useSelectedBlock();
  const removeBlocks = useRemoveBlocks();
  const duplicateBlocks = useDuplicateBlocks();
  const { undo, redo } = useUndoManager();
  const { savePageAsync } = useSavePage();
  const [, setCutBlockIds] = useCutBlockIds();
  const [, setCopyBlockIds] = useCopyBlockIds();
  const { canPaste, pasteBlocks } = usePasteBlocks();
  const options = doc ? { document: doc } : {};

  useHotkeys(
    "ctrl+z,meta+z",
    (e) => {
      e.preventDefault();
      if (undoManager.hasUndo()) {
        undo();
      }
    },
    { ...options, preventDefault: true },
    [undo],
  );
  useHotkeys(
    "ctrl+y,meta+y,ctrl+shift+z,meta+shift+z",
    (e) => {
      e.preventDefault();
      if (undoManager.hasRedo()) {
        redo();
      }
    },
    { ...options, preventDefault: true },
    [redo],
  );
  useHotkeys(
    "ctrl+s,meta+s",
    (e) => {
      e.preventDefault();
      savePageAsync();
    },
    { ...options, preventDefault: true },
    [savePageAsync],
  );
  useHotkeys(
    "ctrl+x,meta+x",
    (e) => {
      // Check if there's selected text in the document
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        // Text is selected - allow browser default cut behavior
        // Do not preventDefault, let the browser handle the cut
        return;
      }

      // No text selected - cut blocks
      e.preventDefault();
      if (!isEmpty(ids)) {
        setCutBlockIds(ids);
      }
    },
    { ...options, enabled: !isEmpty(ids) },
    [ids, setCutBlockIds],
  );
  useHotkeys(
    "ctrl+c,meta+c",
    (e) => {
      // Check if there's selected text in the document
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        // Text is selected - allow browser default copy behavior
        // Do not preventDefault, let the browser handle the copy
        return;
      }

      // No text selected - copy block JSON
      e.preventDefault();
      setCopyBlockIds(ids);
    },
    { ...options, enabled: !isEmpty(ids) },
    [ids, setCopyBlockIds],
  );
  useHotkeys(
    "ctrl+v,meta+v",
    async () => {
      if (await canPaste(ids[0])) {
        pasteBlocks(ids);
      }
    },
    { ...options, enabled: !isEmpty(ids), preventDefault: true },
    [ids, canPaste, pasteBlocks],
  );

  useHotkeys("esc", () => setIds([]), options, [setIds]);
  useHotkeys(
    "ctrl+d,meta+d",
    () => duplicateBlocks(ids),
    { ...options, enabled: !isEmpty(ids), preventDefault: true },
    [ids, duplicateBlocks],
  );
  useHotkeys(
    "del, backspace",
    (event: any) => {
      event.preventDefault();

      if (canDeleteBlock(get(selectedBlock, "_type", ""))) {
        removeBlocks(ids);
      }
    },
    options,
    [ids, removeBlocks],
  );
};
