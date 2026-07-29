import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useUpdateBlocksPropsRealtime } from "~/hooks/use-update-blocks-props";
import { useDeleteUIBlock } from "~/pages/hooks/project/use-block-library-mutations";

interface DeleteBlockConfirmationProps {
  blockId: string;
  libBlockId: string;
  isOpen: boolean;
  onClose: () => void;
  blockName: string;
  trigger?: React.ReactNode;
}

/**
 * Component to confirm deletion of a UI block
 */
export const DeleteBlockConfirmation = ({
  blockId,
  libBlockId,
  isOpen,
  onClose,
  blockName,
  trigger,
}: DeleteBlockConfirmationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateBlockPropsRealtime = useUpdateBlocksPropsRealtime();

  // Delete block mutation
  const deleteBlockMutation = useDeleteUIBlock(() => {
    // On successful delete, remove library ID from the block
    updateBlockPropsRealtime([blockId], { _libBlockId: undefined });
    toast.success("Block deleted successfully");
    setIsLoading(false);
    onClose();
  });

  const handleDelete = () => {
    setIsLoading(true);
    deleteBlockMutation.mutate(libBlockId);
  };

  // Default trigger if none is provided
  const defaultTrigger = (
    <Button type="button" variant="destructive" size="sm" onClick={(e) => e.preventDefault()} disabled={isLoading}>
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent
        className="z-[9999] w-72 p-4"
        // This makes the popover render in a portal at the document body level
        // so it won't be constrained by the dialog's boundaries
        sideOffset={5}
        align="center">
        <div className="space-y-3">
          <h4 className="font-medium">Delete Block</h4>
          <p className="text-sm">
            Are you sure you want to delete the block
            <span className="font-medium"> "{blockName}"</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            This block will be permanently removed from the library. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Delete button with confirmation that works with dialog components
 */
export const DeleteBlockButton = ({
  blockId,
  libBlockId,
  blockName,
  size = "sm",
  className = "",
  close,
}: {
  blockId: string;
  libBlockId: string;
  blockName: string;
  size?: "sm" | "default";
  className?: string;
  close: () => void;
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <DeleteBlockConfirmation
      blockId={blockId}
      libBlockId={libBlockId}
      isOpen={showConfirmation}
      onClose={() => {
        setShowConfirmation(false);
        close();
      }}
      blockName={blockName}
      trigger={
        <Button
          type="button"
          variant="destructive"
          size={size}
          className={className}
          onClick={() => setShowConfirmation(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      }
    />
  );
};
