import { RedoIcon, UndoIcon } from "~/core/components/topbar/topbar-icons";
import { Button } from "~/components/ui/button";
import { useUndoManager } from "~/hooks/history/use-undo-manager";

export const UndoButton = () => {
  const { hasUndo, undo } = useUndoManager();
  return (
    <Button
      disabled={!hasUndo()}
      variant="plain"
      size="icon"
      aria-label="Undo"
      data-component-extra-ui_interaction_source="undo"
      onClick={undo as any}>
      <UndoIcon className="h-5 w-5" />
    </Button>
  );
};

export const RedoButton = () => {
  const { hasRedo, redo } = useUndoManager();
  return (
    <Button
      disabled={!hasRedo()}
      variant="plain"
      size="icon"
      aria-label="Redo"
      data-component-extra-ui_interaction_source="redo"
      onClick={redo as any}>
      <RedoIcon className="h-5 w-5" />
    </Button>
  );
};

export const UndoRedo = () => {
  return (
    <div className="flex items-center gap-0.5">
      <UndoButton />
      <RedoButton />
    </div>
  );
};

export default UndoRedo;