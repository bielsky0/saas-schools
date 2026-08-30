import { ReactNode, useMemo, useState, useEffect } from "react";
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
import { createSectionPickerCategories, PickerItem, createLibraryPickerCategory } from "./picker/picker-categories";
import { PickerPopover } from "./picker/picker-popover";
import { useChaiLibraries } from "~/runtime/client";
import { addPredefinedBlock } from "~/hooks/use-add-block";

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
  const baseCategories = useMemo(() => createSectionPickerCategories(catalog.getByCategory("all")), [catalog]);
  const libraries = useChaiLibraries();
  const { addCoreBlock } = useAddBlock();
  const { addPredefinedBlock: addBlocks } = useAddBlock();
  const selectedBlock = useSelectedBlock();
  const [allBlocks] = useBlocksStore();

  const [libraryCategory, setLibraryCategory] = useState<PickerItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  // Load library category on mount
  useEffect(() => {
    let mounted = true;
    setLibraryLoading(true);
    createLibraryPickerCategory(libraries).then((cat) => {
      if (mounted && cat) {
        setLibraryCategory(cat.items);
      }
      setLibraryLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Merge base categories with library category
  const categories = useMemo(() => {
    const cats = [...baseCategories];
    if (libraryCategory.length > 0) {
      cats.push({ id: "Biblioteka", items: libraryCategory });
    }
    return cats;
  }, [baseCategories, libraryCategory]);

  const handleAdd = async (item: PickerItem) => {
    if (item.isLibraryTemplate && item.libraryId && item.templateId) {
      const lib = libraries.find((l) => l.id === item.libraryId);
      if (lib) {
        const blocks = await lib.getBlock({ block: { id: item.templateId } as any });
        if (blocks && blocks.length > 0) {
          const pos = getSectionInsertPosition(selectedBlock, allBlocks);
          await addBlocks(blocks, undefined, pos);
          pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
          return;
        }
      }
    }
    // Fallback to core block
    addCoreBlock({ type: item.type }, undefined, getSectionInsertPosition(selectedBlock, allBlocks));
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };

  // Icon for library items - use a generic section icon
  const renderIcon = (item: PickerItem) => {
    if (item.isLibraryTemplate) {
      return <SectionRoleIcon role="section" className="h-4 w-4" />;
    }
    return <SectionRoleIcon role={item.role ?? "section"} className="h-4 w-4" />;
  };

  // Preview for library items - use SectionPreview with the template type
  // For library templates, we can't easily preview without rendering the blocks
  // So we'll show a placeholder for now
  const renderPreview = (item: PickerItem) => {
    if (item.isLibraryTemplate) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 text-sm text-gray-500">
          <div className="mb-2 text-lg">📦</div>
          <div className="font-medium">{t(item.label)}</div>
          <div className="text-xs text-gray-400 mt-1">{item.description || t("Library template")}</div>
        </div>
      );
    }
    return <SectionPreview type={item.type} />;
  };

  return (
    <PickerPopover
      trigger={trigger}
      searchPlaceholder={t("Search sections")}
      dialogLabel={t("Add section")}
      categories={categories}
      onAdd={handleAdd}
      renderIcon={renderIcon}
      renderPreview={renderPreview}
    />
  );
};