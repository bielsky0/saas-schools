import { ImageIcon, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { compressImageIfNeeded } from "~/pages/utils/image-compression";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
}

export const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file change
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);

        // Compress image if needed (only for image files)
        let processedFile: File | Blob = file;
        if (file.type.startsWith("image/")) {
          processedFile = await compressImageIfNeeded(file);
        }

        // Create a URL for preview
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result as string);
          setIsUploading(false);
        };
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error("Error reading file:", error);
        setIsUploading(false);
        toast.error("Failed to process image", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [onChange],
  );

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <Button type="button" variant="outline" onClick={handleButtonClick} disabled={isUploading} className="w-full">
          {isUploading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Select image
            </span>
          )}
        </Button>
        {value && (
          <Button type="button" variant="outline" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {value && (
        <div className="aspect-video h-[200px] max-h-[200px] overflow-hidden rounded-md border">
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
        </div>
      )}
    </div>
  );
};
