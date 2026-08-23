import { ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionRoleIcon } from "~/core/components/sidepanels/panels/outline/node";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import type { ChaiBlock } from "~/types/common";
import { getSectionCatalog } from "./section-catalog";
import { SectionPreview } from "./section-preview";
import { createSectionPickerCategories, PickerItem } from "./picker/picker-categories";
import { PickerPopover } from "./picker/picker-popover";

/**
 * Insertion position for a new section: directly after the top-level section
 * that contains the currently selected block, otherwise at the end of the page.
 */
export const getSectionInsertPosition = (selectedBlock: ChaiBlock | undefined, allBlocks: ChaiBlock[]): number => {
  if (!selectedBlock) return -1;
  const byId = new Map(allBlocks.map((block) => [block._id, block]));
  let top: ChaiBlock | undefined = selectedBlock;
  while (top?._parent) {
    top = byId.get(top._parent);
  }
  const rootBlocks = allBlocks.filter((block) => !block._parent);
  const index = rootBlocks.findIndex((block) => block._id === top?._id);
  return index > -1 ? index + 1 : -1;
};

/**
 * Shopify-style Section Picker popover: browse ready-made sections grouped by
 * category, preview on hover, add after the selected section (or at the end).
 */
export const SectionPickerPopover = ({ trigger }: { trigger: ReactNode }) => {
  const { t } = useTranslation();
  const catalog = useMemo(() => getSectionCatalog(), []);
  const categories = useMemo(() => createSectionPickerCategories(catalog.getByCategory("all")), [catalog]);
  const { addCoreBlock } = useAddBlock();
  const selectedBlock = useSelectedBlock();
  const [allBlocks] = useBlocksStore();

  const handleAdd = (item: PickerItem) => {
    addCoreBlock({ type: item.type }, undefined, getSectionInsertPosition(selectedBlock, allBlocks));
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };

  return (
    <PickerPopover
      trigger={trigger}
      searchPlaceholder={t("Search sections")}
      dialogLabel={t("Add section")}
      categories={categories}
      onAdd={handleAdd}
      renderIcon={(item) => <SectionRoleIcon role={item.role ?? "section"} className="h-4 w-4" />}
      renderPreview={(item) => <SectionPreview type={item.type} />}
    />
  );
};