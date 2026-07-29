import { useQueryClient } from "@tanstack/react-query";
import { Info, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SmartJsonInput } from "~/pages/client/components/smart-json-input";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useAddGlobalSchema, useTogglePageGlobalSchema } from "~/pages/hooks/project/mutations";
import { parseJSONWithPlaceholders } from "~/pages/utils/json-utils";

export const AddSharedJsonLD = ({
  show,
  onClose,
  initialData,
}: {
  show?: boolean;
  onClose: () => void;
  initialData?: { name: string; description: string; jsonld: any; languageCode?: string; primaryPageId?: string };
}) => {
  return (
    <Dialog open={show} onOpenChange={() => onClose()}>
      {show && <AddSharedJsonLDDialogContent show={show} onClose={onClose} initialData={initialData} />}
    </Dialog>
  );
};

const AddSharedJsonLDDialogContent = ({
  show,
  onClose,
  initialData,
}: {
  show?: boolean;
  onClose: () => void;
  initialData?: { name: string; description: string; jsonld: any; languageCode?: string; primaryPageId?: string };
}) => {
  const [item, setItem] = useState({
    name: "",
    content: "",
    description: "",
    enabledByDefaultForNewPages: false,
  });
  const [addToAllExistingPages, setAddToAllExistingPages] = useState(false);
  const { data: primaryPage } = usePrimaryPage();
  const { mutateAsync: addGlobalSchema, isPending } = useAddGlobalSchema();
  const { mutateAsync: togglePageGlobalSchema } = useTogglePageGlobalSchema();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData) {
      setItem({
        name: initialData.name,
        description: initialData.description,
        content: JSON.stringify(initialData.jsonld, null, 2),
        enabledByDefaultForNewPages: false,
      });
    } else {
      setItem({ name: "", description: "", content: "", enabledByDefaultForNewPages: false });
    }
    setAddToAllExistingPages(false);
  }, [show, initialData]);

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

    const payload: any = {
      name: item.name,
      jsonld: parsed.parsed,
      addToExistingPages: addToAllExistingPages,
      addToNewPages: item.enabledByDefaultForNewPages,
      description: item.description,
    };

    // If this is for a secondary language, include the primaryPage
    if (initialData?.primaryPageId) {
      payload.primaryPage = initialData.primaryPageId;
    }

    const result = await addGlobalSchema(payload);

    // Automatically enable the schema on the current page (only for default language schemas)
    if (primaryPage?.id && result?.id && !initialData?.primaryPageId) {
      await togglePageGlobalSchema({
        schemaId: result.id,
        pageId: primaryPage.id,
        enabled: true,
      });

      // Invalidate language pages to refresh the current page data immediately
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_LANGUAGE_PAGES, primaryPage.id],
      });
    }

    onClose();
  };

  return (
    <DialogContent className="flex max-w-xl flex-col overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Shared JSON-LD Schema</DialogTitle>
      </DialogHeader>
      <div className="flex max-h-[75vh] flex-col space-y-2 overflow-y-auto">
        {initialData?.languageCode && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              You are creating a <span className="font-semibold">{initialData.languageCode}</span> language version of
              this schema. This will be linked to the default language schema.
            </AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="new-name">Schema Name</Label>
          <Input
            id="new-name"
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            placeholder="e.g., Product Schema"
            className="text-xs"
          />
        </div>

        <div>
          <Label htmlFor="new-description">Description</Label>
          <Input
            id="new-description"
            value={item.description || ""}
            onChange={(e) => setItem({ ...item, description: e.target.value })}
            placeholder="Brief description of this schema"
          />
        </div>
        <div>
          <Label htmlFor="new-content">JSON-LD Content</Label>
          <SmartJsonInput
            id="new-content"
            value={item.content || "{}"}
            onChange={(value) => setItem({ ...item, content: value })}
            placeholder="Enter JSON-LD markup..."
            rows={10}
          />
        </div>
        {!initialData?.primaryPageId && (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="add-to-all-existing"
                checked={addToAllExistingPages}
                onChange={(e) => setAddToAllExistingPages(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <Label htmlFor="add-to-all-existing">
                <div>Add to all existing pages</div>
                <div className="text-xs font-light text-muted-foreground">
                  This schema will be added to all existing pages on your site
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-enabled"
                checked={item.enabledByDefaultForNewPages}
                onChange={(e) => setItem({ ...item, enabledByDefaultForNewPages: e.target.checked })}
                className="h-5 w-5 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <Label htmlFor="new-enabled">
                <div>Enabled by default for new pages</div>
                <div className="text-xs font-light text-muted-foreground">
                  New pages will automatically include this schema
                </div>
              </Label>
            </div>
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
                  <Loader className="h-4 w-4 animate-spin" /> Adding
                </>
              ) : (
                <>Add Schema{initialData?.languageCode && ` (${initialData.languageCode})`}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
};
