import { atom, useAtom } from "jotai";
import { noop } from "lodash-es";
import { useCallback, useEffect, useMemo } from "react";
import UndoManager from "undo-manager";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { builderSaveStateAtom } from "~/hooks/use-save-page";

const undoManager = new UndoManager();
undoManager.setLimit(50);

export { undoManager };

const undoRedoStateAtom = atom({
  canUndo: false,
  canRedo: false,
});

const useUndoManager = () => {
  const [, setSaveState] = useAtom(builderSaveStateAtom);
  const [undoRedoState, setUndoRedoState] = useAtom(undoRedoStateAtom);
  const emitSaveState = useBuilderProp("onSaveStateChange", noop);

  const updateUndoRedoState = useCallback(() => {
    const newState = {
      canUndo: undoManager.hasUndo(),
      canRedo: undoManager.hasRedo(),
    };
    setUndoRedoState(newState);
    setSaveState("UNSAVED");
    emitSaveState("UNSAVED");
  }, [setUndoRedoState, setSaveState, emitSaveState]);

  useEffect(() => {
    undoManager.setCallback(updateUndoRedoState);
    return () => {
      undoManager.setCallback(noop);
    };
  }, [updateUndoRedoState]);

  const add = useCallback(
    (action: any) => {
      undoManager.add(action);
      updateUndoRedoState();
    },
    [updateUndoRedoState],
  );

  const undo = useCallback(() => {
    undoManager.undo();
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    undoManager.redo();
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const clear = useCallback(() => {
    undoManager.clear();
    setUndoRedoState({
      canUndo: false,
      canRedo: false,
    });
  }, [setUndoRedoState]);

  return useMemo(
    () => ({
      add,
      undo,
      redo,
      hasUndo: () => undoRedoState.canUndo,
      hasRedo: () => undoRedoState.canRedo,
      clear,
    }),
    [add, undo, redo, undoRedoState.canUndo, undoRedoState.canRedo, clear],
  );
};

export { useUndoManager };
