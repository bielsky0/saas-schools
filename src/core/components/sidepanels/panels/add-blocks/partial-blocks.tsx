import { FrameIcon } from "@radix-ui/react-icons";
import { atom, useAtom } from "jotai";
import { map, uniq } from "lodash-es";
import { useEffect, useMemo } from "react";
import { ChaiBuilderBlocks } from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import { useCheckPartialCanAdd, usePartialBlocksList } from "~/hooks/use-partial-blocks-store";

// Create an atom to store the fetched partial blocks
const partialBlocksDataAtom = atom<{
  blocks: any[];
  groups: string[];
  isLoading: boolean;
  error: string | null;
}>({
  blocks: [],
  groups: [],
  isLoading: true,
  error: null,
});

// Create a flag atom to track if data has been fetched
const hasInitializedPartialBlocksAtom = atom<boolean>(false);

// Define the type for partial block data
interface PartialBlockData {
  name?: string;
  description?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Format a string to be more readable by:
 * 1. Replacing hyphens and underscores with spaces
 * 2. Adding spaces before capital letters (camelCase to "camel Case")
 * 3. Capitalizing the first letter of each word
 */
const formatReadableName = (name: string): string => {
  if (!name) return "";

  // Replace hyphens and underscores with spaces
  let formatted = name.replace(/[-_]/g, " ");

  // Add spaces before capital letters (camelCase to "camel Case")
  formatted = formatted.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Capitalize the first letter of each word
  return formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const PartialBlocks = ({
  parentId,
  position,
  gridCols = "grid-cols-2",
  disableBlockGroupsSidebar = false,
}: {
  parentId?: string;
  position?: number;
  gridCols?: string;
  disableBlockGroupsSidebar?: boolean;
}) => {
  const { data: partialBlocksList, isLoading, refetch, error: apiError } = usePartialBlocksList();
  const [partialBlocksData, setPartialBlocksData] = useAtom(partialBlocksDataAtom);
  const [hasInitialized, setHasInitialized] = useAtom(hasInitializedPartialBlocksAtom);
  const checkPartialCanAdd = useCheckPartialCanAdd();

  // Only fetch and process data if it hasn't been initialized yet
  useEffect(() => {
    if (!hasInitialized || Object.keys(partialBlocksData.blocks).length === 0) {
      if (apiError) {
        // Handle error from getPartialBlocks
        setPartialBlocksData({
          blocks: [],
          groups: [],
          isLoading: false,
          error: apiError,
        });
        setHasInitialized(true);
      } else if (!isLoading && Object.keys(partialBlocksList || {}).length > 0) {
        // Convert partial blocks to a format compatible with ChaiBuilderBlocks
        const partialBlocks = Object.entries(partialBlocksList).map(([id, blockData]) => {
          // Cast blockData to PartialBlockData type
          const block = blockData as PartialBlockData;

          // Use the block's type as the group if available, otherwise default to "partial"
          const group = block.type || "partial";

          // Format the group name to be more readable
          const formattedGroup = formatReadableName(group);

          return {
            type: "PartialBlock", // Set the type to PartialBlock
            label: formatReadableName(block.name || id),
            description: block.description || "",
            icon: FrameIcon,
            group: formattedGroup, // Use formatted type as group
            category: "partial",
            partialBlockId: id, // Store the original ID as partialBlockId
            _name: block.name,
          };
        });

        const uniqueGroups = uniq(map(partialBlocks, "group"));

        setPartialBlocksData({
          blocks: partialBlocks,
          groups: uniqueGroups,
          isLoading: false,
          error: null,
        });

        setHasInitialized(true);
      } else if (isLoading) {
        setPartialBlocksData((prev) => ({ ...prev, isLoading: true, error: null }));
      } else if (!isLoading && Object.keys(partialBlocksList || {}).length === 0) {
        // Handle empty response from getPartialBlocks
        setPartialBlocksData({
          blocks: [],
          groups: [],
          isLoading: false,
          error: "No partial blocks available",
        });
        setHasInitialized(true);
      }
    }
  }, [
    isLoading,
    partialBlocksList,
    hasInitialized,
    setHasInitialized,
    setPartialBlocksData,
    partialBlocksData.blocks,
    apiError,
  ]);

  // Handle manual refresh
  const handleRefresh = () => {
    setPartialBlocksData((prev) => ({ ...prev, isLoading: true, error: null }));
    setHasInitialized(false);
    refetch();
  };

  // Add disabled state to blocks based on circular dependency check
  // Must be called before early returns to maintain hooks order
  const blocksWithDisabledState = useMemo(() => {
    return partialBlocksData.blocks.map((block) => {
      const { canAdd, reason } = checkPartialCanAdd(block.partialBlockId);
      return {
        ...block,
        disabled: !canAdd,
        disabledReason: reason,
      };
    });
  }, [partialBlocksData.blocks, checkPartialCanAdd]);

  if (partialBlocksData.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
        Loading partial blocks...
      </div>
    );
  }

  if (partialBlocksData.error || partialBlocksData.blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{partialBlocksData.error || "No partial blocks available"}</p>
        <button
          onClick={handleRefresh}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <ChaiBuilderBlocks
      gridCols={gridCols}
      parentId={parentId}
      position={position}
      groups={partialBlocksData.groups}
      blocks={blocksWithDisabledState}
      disableBlockGroupsSidebar={disableBlockGroupsSidebar}
    />
  );
};
