import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { usePermissions } from "~/hooks/use-permissions";
import { DeleteBlockConfirmation } from "~/pages/client/components/save-ui-blocks/delete-block-confirmation";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";

interface EditBlockButtonProps {
  blockId: string;
  libBlockId: string;
  blockName: string;
  onEdit: () => void;
}

/**
 * Button that provides options to edit or delete a UI block
 */
export const EditBlockButton = ({ blockId, libBlockId, blockName, onEdit }: EditBlockButtonProps) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check if user has permission to delete library blocks
  const { hasPermission } = usePermissions();
  const canDeleteBlocks = hasPermission(PAGES_PERMISSIONS.DELETE_LIBRARY_BLOCK);

  if (showDeleteConfirmation) {
    return (
      <Card className="w-[260px] border-destructive/20 shadow-md">
        <CardContent className="p-4">
          <DeleteBlockConfirmation
            blockId={blockId}
            libBlockId={libBlockId}
            blockName={blockName}
            isOpen={showDeleteConfirmation}
            onClose={() => setShowDeleteConfirmation(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 focus:ring-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        {canDeleteBlocks && (
          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false);
              setShowDeleteConfirmation(true);
            }}
            className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
