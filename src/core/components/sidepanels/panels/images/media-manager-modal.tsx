import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { useMediaManagerComponent } from "~/runtime/client";
import { ChaiAsset } from "~/types";

const MediaManagerModal = ({
  assetId,
  children,
  onSelect,
  mode = "image",
}: {
  assetId?: string;
  children: React.JSX.Element;
  onSelect: (assets: ChaiAsset[] | ChaiAsset) => void;
  mode?: "image" | "video" | "audio";
}) => {
  const [open, setOpen] = useState(false);
  const MediaManagerComponent = useMediaManagerComponent();

  const handleSelect = (...arg: any) => {
    //@ts-ignore
    onSelect.call(this, ...arg);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_open: boolean) => setOpen(_open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-7xl border-border md:w-fit">
        <DialogTitle className="sr-only">Media Manager</DialogTitle>
        <div className="h-full w-full">
          {MediaManagerComponent ? (
            <MediaManagerComponent close={() => setOpen(false)} onSelect={handleSelect} mode={mode} assetId={assetId} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

MediaManagerModal.displayName = "MediaManagerModal";

export default MediaManagerModal;
