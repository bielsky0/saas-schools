import { groupBy, map, uniq } from "lodash-es";
import { ChaiBuilderBlocks } from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import { useRegisteredChaiBlocks } from "~/runtime";

export const DefaultChaiBlocks = ({
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
  const chaiBlocks = useRegisteredChaiBlocks();

  const groupedBlocks = groupBy(chaiBlocks, "category") as Record<string, any[]>;
  const uniqueTypeGroup = uniq(map(groupedBlocks.core, "group"));

  return (
    <ChaiBuilderBlocks
      gridCols={gridCols}
      parentId={parentId}
      position={position}
      groups={uniqueTypeGroup}
      blocks={groupedBlocks.core}
      disableBlockGroupsSidebar={disableBlockGroupsSidebar}
    />
  );
};
