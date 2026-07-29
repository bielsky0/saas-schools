import { debounce } from "lodash-es";
import { Copy, Loader, Save } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import FilerobotImageEditor from "react-filerobot-image-editor";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import "./image-editor.css";

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageBase64: Base64URLString, isCopy: boolean) => void;
  onClose: () => void;
  defaultSavedImageName?: string;
  isEditing?: boolean;
}

type AvailableTabs = "Adjust" | "Annotate" | "Watermark" | "Filters" | "Finetune" | "Resize";

const ImageEditor: React.FC<ImageEditorProps> = memo(
  ({ imageUrl, onSave, onClose, defaultSavedImageName, isEditing = false }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(true);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Preload the image
    useEffect(() => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => setIsImageLoaded(true);
      return () => {
        img.onload = null;
      };
    }, [imageUrl]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && isEditorOpen) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      };
      document.addEventListener("keydown", handleKeyDown, true);

      return () => {
        document.removeEventListener("keydown", handleKeyDown, true);
      };
    }, []);

    // Debounced save handler
    const debouncedSave = useMemo(
      () =>
        debounce(async (editedImageObject: any, isCopy = false) => {
          setIsLoading(true);
          const editedImageBase64 = editedImageObject.imageBase64;
          await onSave(editedImageBase64, isCopy);
          setIsEditorOpen(false);
          setIsLoading(false);
        }, 300),
      [onSave],
    );

    const handleSave = useCallback(
      (editedImageObject: any, isCopy = false) => {
        debouncedSave(editedImageObject, isCopy);
      },
      [debouncedSave],
    );

    const handleClose = useCallback(() => {
      setIsEditorOpen(false);
      onClose();
    }, [onClose]);

    // Memoize tabs configuration
    const tabsConfig = useMemo(
      () => ({
        tabsIds: ["Adjust", "Annotate", "Watermark", "Finetune", "Resize", "Filters"] as AvailableTabs[],
        toolsIds: ["Rotate"],
        defaultTabId: "Adjust" as AvailableTabs,
        defaultToolId: "Rotate" as any,
      }),
      [],
    );

    // Memoize theme configuration
    const themeConfig = useMemo(
      () => ({
        colors: {
          primary: "#000000",
          secondary: "#000000",
          tertiary: "#000000",
        },
      }),
      [],
    );

    // Memoize save options
    const saveOptions = useMemo(
      () =>
        isEditing
          ? [
              {
                label: t("Update this file"),
                onClick: (_: any, triggerSave: any) =>
                  triggerSave((...args: any[]) => {
                    setIsLoading(true);
                    handleSave(args[0], false);
                  }),
                icon: Save,
              },
              {
                label: t("Save as new file"),
                onClick: (_: any, triggerSave: any) =>
                  triggerSave((...args: any[]) => {
                    setIsLoading(true);
                    handleSave(args[0], true);
                  }),
                icon: Copy,
              },
            ]
          : [],
      [isEditing, handleSave, t],
    );

    return (
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent
          id="chai-image-editor-container"
          className="flex h-[80vh] max-h-[1232px] w-[80vw] max-w-[1232px] flex-col space-y-4 p-0">
          {isLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          )}
          {isEditorOpen && isImageLoaded && (
            <FilerobotImageEditor
              theme={themeConfig}
              source={imageUrl}
              onSave={handleSave as any}
              onClose={handleClose}
              Text={{ text: t("Add text here") }}
              Rotate={{ angle: 90, componentType: "slider" }}
              tabsIds={tabsConfig.tabsIds}
              defaultTabId={tabsConfig.defaultTabId}
              defaultToolId={tabsConfig.defaultToolId}
              savingPixelRatio={20}
              previewPixelRatio={6}
              defaultSavedImageName={defaultSavedImageName}
              moreSaveOptions={saveOptions}
              useZoomPresetsMenu={true}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  },
);

ImageEditor.displayName = "ImageEditor";

export default ImageEditor;
