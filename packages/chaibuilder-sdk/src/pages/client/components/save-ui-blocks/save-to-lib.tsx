import { has, isEmpty, set } from "lodash-es";
import { AlertCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useLibraryBlocks } from "~/hooks/use-library-blocks";
import { usePartialBlocksStore } from "~/hooks/use-partial-blocks-store";
import { usePermissions } from "~/hooks/use-permissions";
import { useUpdateBlocksPropsRealtime } from "~/hooks/use-update-blocks-props";
import { DeleteBlockButton } from "~/pages/client/components/save-ui-blocks/delete-block-confirmation";
import { GroupSelector } from "~/pages/client/components/save-ui-blocks/group-selector";
import { ImageUpload } from "~/pages/client/components/save-ui-blocks/image-upload";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";
import { useGetUIBlockDetails, useSaveUIBlock } from "~/pages/hooks/project/use-block-library-mutations";
import { ChaiBlock } from "~/types/common";

// Define the props interface
interface SaveToLibraryProps {
  blockId: string;
  blocks: ChaiBlock[];
  close: () => void;
}

const SaveToLibrary = (args: SaveToLibraryProps) => {
  const { blocks, close, blockId } = args;
  const { getPartialBlocks } = usePartialBlocksStore();

  // Find the current block
  const currentBlock = blocks.find((b) => b._id === blockId);
  // Check if this is an edit mode (block has a library ID)
  const libBlockId = currentBlock?._libBlockId;
  const isEditMode = !!libBlockId;

  // Check if blocks contain any Partial blocks
  const hasPartialBlocks = useMemo(() => {
    return blocks.some((block) => block._type === "PartialBlock" || block._type === "GlobalBlock");
  }, [blocks]);

  const mergedWithPartialBlocks = useMemo(() => {
    // Create a new array with partial blocks replaced by their actual content
    let result: ChaiBlock[] = [];

    for (const block of blocks) {
      if (block._type === "PartialBlock" || block._type === "GlobalBlock") {
        // Get the expanded content of the partial block
        let partialBlocks = getPartialBlocks(block.partialBlockId!);
        if (block._parent && partialBlocks?.length > 0) {
          partialBlocks = partialBlocks.map((b: ChaiBlock) => {
            if (isEmpty(b._parent)) {
              set(b, "_parent", block._parent);
            }
            return b;
          });
        }
        // Add each block from the partial block to our result
        result = [...result, ...partialBlocks];
      } else {
        // Keep non-partial blocks as is
        result.push(block);
      }
    }
    return result;
  }, [blocks, getPartialBlocks]);

  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    group?: string;
  }>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [blockNotFound, setBlockNotFound] = useState(false);

  // Check if user has permission to delete library blocks
  const { hasPermission } = usePermissions();

  const canDeleteBlocks = hasPermission(PAGES_PERMISSIONS.DELETE_LIBRARY_BLOCK);

  const updateBlockPropsRealtime = useUpdateBlocksPropsRealtime();

  // Handler for delinking the block if it doesn't exist on the server
  const handleDelinkBlock = () => {
    updateBlockPropsRealtime([blockId], { _libBlockId: undefined });
    toast.success("Block delinked from library");
    close();
  };

  // Fetch existing block details if in edit mode
  const {
    data: blockDetails,
    isLoading: isLoadingBlockDetails,
    isError: isBlockDetailsError,
  } = useGetUIBlockDetails(libBlockId);

  // Handle case where block doesn't exist anymore
  useEffect(() => {
    if (isBlockDetailsError && isEditMode) {
      setBlockNotFound(true);
      setIsLoading(false);
    }
  }, [isBlockDetailsError, isEditMode]);

  // Pre-fill form with existing block data when available
  useEffect(() => {
    if (blockDetails && !isLoadingBlockDetails) {
      setName(blockDetails.name || "");
      setGroup(blockDetails.group || "");
      setDescription(blockDetails.description || "");
      setPreviewImage(blockDetails.preview || "");
      setIsLoading(false);
    }
  }, [blockDetails, isLoadingBlockDetails]);

  // Validate form on input changes
  useEffect(() => {
    const nameValid = name.trim().length >= 2;
    const groupValid = group.trim() !== "";
    // Only set form as valid if there are no partial blocks
    setIsFormValid(nameValid && groupValid);
  }, [name, group]);

  // Complete form validation
  const validateForm = () => {
    const newErrors: { name?: string; group?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!group) {
      newErrors.group = "Group is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { resetLibrary } = useLibraryBlocks({ id: "" });
  // Set up the save block mutation with appropriate success callback
  const saveBlockMutation = useSaveUIBlock((response: { id: string; library: string }) => {
    // Update the block with the library ID if this is a new block
    if (!isEditMode) {
      updateBlockPropsRealtime([blockId], { _libBlockId: response.id });
    }
    toast.success(`Block ${isEditMode ? "updated" : "saved"} successfully`);
    resetLibrary(response.library);
    close();
  });

  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    //remove _libBlockId from the blocks
    const blocksWithoutLibBlockId = mergedWithPartialBlocks.map((block) => {
      if (has(block, "_libBlockId")) {
        delete block._libBlockId; //
      }
      return block;
    });

    // Save the block (including preview image if present and it's a base64 image)
    saveBlockMutation.mutate({
      name: name.trim(),
      group,
      blocks: blocksWithoutLibBlockId,
      description: description.trim(),
      // Only include previewImage if it exists and is a base64 image
      ...(previewImage && previewImage.startsWith("data:") ? { previewImage } : {}),
      // Include id if in edit mode
      ...(isEditMode ? { id: libBlockId } : {}),
    });
  };

  // Check if any mutation is in progress
  const isSubmitting = saveBlockMutation.isPending;

  if (isLoading || isLoadingBlockDetails) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show error UI if block not found
  if (blockNotFound) {
    return (
      <div className="space-y-4 p-6">
        <div className="font-medium text-destructive">Block Not Found</div>
        <p className="text-sm text-muted-foreground">
          This block could not be found on the server. It may have been deleted.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleDelinkBlock} variant="destructive">
            Delink Block
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {hasPartialBlocks && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Partial Blocks Detected</p>
            <p className="mt-1 text-xs">
              This block contains one or more Partial Blocks. Partial blocks will be merged into the library block
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>
            Name
          </Label>
          <Input
            id="name"
            placeholder="Enter block name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="group" className={errors.group ? "text-destructive" : ""}>
            Group
          </Label>
          <GroupSelector value={group} onChange={setGroup} />
          {errors.group && <p className="text-xs text-destructive">{errors.group}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            placeholder="Enter a brief description"
            className="resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="previewImage">Preview Image (optional)</Label>
          <ImageUpload value={previewImage} onChange={setPreviewImage} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {isEditMode && canDeleteBlocks && (
            <DeleteBlockButton
              blockId={blockId}
              libBlockId={libBlockId}
              blockName={name}
              className="mr-auto"
              close={close}
            />
          )}
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? "Saving..." : isEditMode ? "Update Block" : "Save Block"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SaveToLibrary;
