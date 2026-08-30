import { groupBy, map, uniq } from "lodash-es";
import React from "react";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { ChaiBuilderBlocks } from "~/core/components/sidepanels/panels/add-blocks/add-blocks";
import { useRegisteredChaiBlocks } from "~/runtime";
import type { ChaiBlockComponentProps, ChaiBlockConfig } from "~/types/blocks";

const BLOG_BLOCK_GROUP = "Blog";
const ENROLLMENT_BLOCK_GROUP = "Enrollment";

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
  // Dedicated enrollment blocks (group "Enrollment") are only available while
  // editing an enrollment layout template (mvp-plan F2).
  const isEnrollmentTemplate =
    context.type === "template" && context.collectionId === "enrollments";

  const groupedBlocks = groupBy(chaiBlocks, "category") as Record<string, RegisteredBlock[]>;
  // Dedicated block groups are scoped to their own template context:
  //   - blog template → blog blocks only (enrollment hidden)
  //   - enrollment template → enrollment blocks only (blog hidden)
  //   - anything else → neither group
  const coreBlocks = (groupedBlocks.core ?? []).filter((block) => {
    if (isBlogTemplate) return block.group !== ENROLLMENT_BLOCK_GROUP;
    if (isEnrollmentTemplate) return block.group !== BLOG_BLOCK_GROUP;
    return block.group !== BLOG_BLOCK_GROUP && block.group !== ENROLLMENT_BLOCK_GROUP;
  });
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
