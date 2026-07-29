import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SmartJsonInput } from "~/pages/client/components/smart-json-input";
import {
  useApplySchemaToAllPages,
  useRemoveSchemaFromAllPages,
  useUpdateGlobalSchema,
} from "~/pages/hooks/project/mutations";
import { useGlobalJsonLDItems } from "~/pages/hooks/use-global-json-ld";
import { parseJSONWithPlaceholders } from "~/pages/utils/json-utils";

export const EditSharedJsonLD = ({ id, onClose }: { id: string | null; onClose: () => void }) => {
  return (
    <Dialog open={!!id} onOpenChange={() => onClose()}>
      {id && <EditSharedJsonLDDialogContent id={id} onClose={onClose} />}
    </Dialog>
  );
};

const EditSharedJsonLDDialogContent = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const [item, setItem] = useState({
    name: "",
    content: "",
    description: "",
    enabledByDefaultForNewPages: false,
  });
  const [showAddToAllConfirm, setShowAddToAllConfirm] = useState(false);
  const [showRemoveFromAllConfirm, setShowRemoveFromAllConfirm] = useState(false);
  const [isLanguageVariant, setIsLanguageVariant] = useState(false);
  const { data: globalJsonLD } = useGlobalJsonLDItems();
  const { mutateAsync: updateGlobalSchema, isPending } = useUpdateGlobalSchema();
  const { mutateAsync: applySchemaToAllPages } = useApplySchemaToAllPages();
  const { mutateAsync: removeSchemaFromAllPages } = useRemoveSchemaFromAllPages();

  useEffect(() => {
    if (id && globalJsonLD) {
      const data = globalJsonLD.find((item: any) => item.id === id);
      if (data) {
        setItem({
          name: data.name,
          description: data.metadata?.description || "",
          content: JSON.stringify(data.jsonld, null, 2),
          enabledByDefaultForNewPages: data.metadata?.addToNewPages || false,
        });
        // Check if this is a language variant (has primaryPage)
        setIsLanguageVariant(!!data.primaryPage);
      }
    }
  }, [id, globalJsonLD]);

  const handleSubmit = async () => {
    if (!item.name || !item.content) {
      toast.error("Please enter a name and content");
      return;
    }

    const parsed = parseJSONWithPlaceholders(item.content);
    if (!parsed.isValid) {
      toast.error("Invalid JSON-LD content");
      return;
    }

    const payload = {
      id,
      name: item.name,
      jsonld: parsed.parsed,
      addToNewPages: item.enabledByDefaultForNewPages,
      description: item.description,
    };

    await updateGlobalSchema(payload);
    onClose();
  };

  const handleAddToAll = async () => {
    try {
      await applySchemaToAllPages(id);
    } finally {
      setShowAddToAllConfirm(false);
    }
  };

  const handleRemoveFromAll = async () => {
    try {
      await removeSchemaFromAllPages(id);
    } finally {
      setShowRemoveFromAllConfirm(false);
    }
  };

  return (
    <DialogContent className="flex max-w-xl flex-col overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Shared JSON-LD Schema</DialogTitle>
      </DialogHeader>
      <div className="flex max-h-[75vh] flex-col space-y-2 overflow-y-auto">
        {!isLanguageVariant && (
          <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-500/10 p-2">
            <div>
              <div className="text-sm font-medium text-blue-900">Manage Existing Pages</div>
              <div className="text-xs text-blue-700">
                Add or remove this schema from all existing pages on your site
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="text-xs" variant="outline" onClick={() => setShowAddToAllConfirm(true)}>
                Add to all existing
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowRemoveFromAllConfirm(true)}>
                Remove from all
              </Button>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="edit-name">Schema Name</Label>
          <Input
            id="edit-name"
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            placeholder="e.g., Product Schema"
            className="text-xs"
          />
        </div>

        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Input
            id="edit-description"
            value={item.description || ""}
            onChange={(e) => setItem({ ...item, description: e.target.value })}
            placeholder="Brief description of this schema"
          />
        </div>
        <div>
          <Label htmlFor="edit-content">JSON-LD Content</Label>
          <SmartJsonInput
            id="edit-content"
            value={item.content || "{}"}
            onChange={(value) => setItem({ ...item, content: value })}
            placeholder="Enter JSON-LD markup..."
            rows={10}
          />
        </div>
        {!isLanguageVariant && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit-enabled"
              checked={item.enabledByDefaultForNewPages}
              onChange={(e) => setItem({ ...item, enabledByDefaultForNewPages: e.target.checked })}
              className="h-5 w-5 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <Label htmlFor="edit-enabled">
              <div>Enabled by default for new pages</div>
              <div className="text-xs font-light text-muted-foreground">
                New pages will automatically include this schema
              </div>
            </Label>
          </div>
        )}
        <div className="border-t pt-3">
          <div className="flex items-center justify-end gap-2">
            <Button disabled={isPending} variant="outline" type="button" size="sm" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button disabled={isPending} type="button" size="sm" onClick={handleSubmit}>
              {isPending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" /> Updating
                </>
              ) : (
                "Update Schema"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add to All Confirmation Dialog */}
      <AlertDialog open={showAddToAllConfirm} onOpenChange={setShowAddToAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to All Existing Pages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the schema <span className="font-medium">{item.name}</span> to all existing pages on your
              site. This action cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddToAll}>Add to All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from All Confirmation Dialog */}
      <AlertDialog open={showRemoveFromAllConfirm} onOpenChange={setShowRemoveFromAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from All Pages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the schema <span className="font-medium">{item.name}</span> from all existing pages on
              your site. This action cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFromAll} className="bg-red-500 hover:bg-red-600">
              Remove from All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
};
