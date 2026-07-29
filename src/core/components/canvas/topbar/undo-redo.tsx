import { ResetIcon } from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";
import { useUndoManager } from "~/hooks/history/use-undo-manager";

export const UndoRedo = () => {
  const { hasUndo, hasRedo, undo, redo } = useUndoManager();
  return (
    <div className="flex items-center">
      <Button disabled={!hasUndo()} size="sm" onClick={undo as any} className="rounded-full" variant="ghost">
        <ResetIcon />
      </Button>
      <Button disabled={!hasRedo()} onClick={redo as any} size="sm" className="rounded-full" variant="ghost">
        <ResetIcon className="rotate-180 scale-y-[-1] transform" />
      </Button>
    </div>
  );
};
