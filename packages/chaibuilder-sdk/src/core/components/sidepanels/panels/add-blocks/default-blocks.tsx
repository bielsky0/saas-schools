import { groupBy, map, reject, uniq } from "lodash-es";
import React from "react";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { ChaiBuilderBlocks } from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import { useRegisteredChaiBlocks } from "~/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "~/types/blocks";

const BLOG_BLOCK_GROUP = "Blog";

type RegisteredBlock = ChaiBlockConfig & {
  component: React.ComponentType<ChaiBlockComponentProps>;
};

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
  const { context } = useEditorContext();

  // Dedicated blog blocks (group "Blog") are only available while editing a
  // blog collection layout template (blog-templates-cms F5.2).
  const isBlogTemplate = context.type === "template" && context.collectionId === "blog";

  const groupedBlocks = groupBy(chaiBlocks, "category") as Record<string, RegisteredBlock[]>;
  const coreBlocks = isBlogTemplate
    ? groupedBlocks.core
    : reject(groupedBlocks.core, { group: BLOG_BLOCK_GROUP });
  const uniqueTypeGroup = uniq(map(coreBlocks, "group"));

  return (
    <ChaiBuilderBlocks
      gridCols={gridCols}
      parentId={parentId}
      position={position}
      groups={uniqueTypeGroup}
      blocks={coreBlocks}
      disableBlockGroupsSidebar={disableBlockGroupsSidebar}
    />
  );
};
