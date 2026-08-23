import { find, values } from "lodash-es";
import { ReactNode, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TypeIcon } from "~/core/components/sidepanels/panels/outline/block-type-icon";
import { canAcceptChildBlock, canBeNestedInside } from "~/core/functions/block-helpers";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useRegisteredChaiBlocks } from "~/runtime";
import { SectionPreview } from "./section-preview";
import { createBlockCatalog, PickerItem } from "./picker/picker-categories";
import { PickerPopover } from "./picker/picker-popover";

const BLOG_BLOCK_GROUP = "Blog";

/**
 * Shopify-style Block Picker popover: browse the blocks that the target
 * section can accept, grouped by category, preview on hover, add at the end
 * of the section's block list.
 */
export const BlockPickerPopover = ({
  trigger,
  parentId,
  position = -1,
}: {
  trigger: ReactNode;
  parentId?: string;
  position?: number;
}) => {
  const { t } = useTranslation();
  const registered = useRegisteredChaiBlocks();
  const [allBlocks] = useBlocksStore();
  const { context } = useEditorContext();
  const { addCoreBlock } = useAddBlock();

  // Dedicated blog blocks are only available while editing a blog template.
  const isBlogTemplate = context.type === "template" && context.collectionId === "blog";

  const parentType = useMemo(() => find(allBlocks, { _id: parentId })?._type, [allBlocks, parentId]);

  const canAddBlock = useCallback(
    (type: string) => {
      if (!parentType) return true;
      return canAcceptChildBlock(parentType, type) && canBeNestedInside(parentType, type);
    },
    [parentType],
  );

  const categories = useMemo(
    () =>
      createBlockCatalog(
        values(registered)
          .filter((block) => isBlogTemplate || block.group !== BLOG_BLOCK_GROUP)
          .map((block) => ({ type: block.type, label: block.label, group: block.group, hidden: block.hidden })),
        parentType,
        canAddBlock,
      ),
    [registered, isBlogTemplate, parentType, canAddBlock],
  );

  const handleAdd = (item: PickerItem) => {
    addCoreBlock({ type: item.type }, parentId ?? null, position);
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };

  return (
    <PickerPopover
      trigger={trigger}
      searchPlaceholder={t("Search blocks")}
      dialogLabel={t("Add block")}
      categories={categories}
      onAdd={handleAdd}
      renderIcon={(item) => <TypeIcon type={item.type} />}
      renderPreview={(item) => <SectionPreview type={item.type} />}
    />
  );
};