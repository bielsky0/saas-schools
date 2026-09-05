import { find, values } from "lodash-es";
import { ReactNode, useCallback, useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionRoleIcon } from "~/core/components/sidepanels/panels/outline/node";
import { TypeIcon } from "~/core/components/sidepanels/panels/outline/block-type-icon";
import { canAcceptChildBlock, canBeNestedInside } from "~/core/functions/block-helpers";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { useEditorContext } from "~/hooks/use-editor-mode";
import { useRegisteredChaiBlocks } from "~/runtime";
import { useChaiLibraries } from "~/runtime/client";
import { SectionPreview } from "./section-preview";
import { getSectionInsertPosition } from "./section-picker";
import {
  createBlockCatalog,
  PickerItem,
  PickerTab,
  createLibraryPickerCategory,
} from "./picker/picker-categories";
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
  const { addCoreBlock, addPredefinedBlock } = useAddBlock();
  const libraries = useChaiLibraries();

  const [libraryCategory, setLibraryCategory] = useState<PickerItem[]>([]);

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

  // Load library category on mount
  useEffect(() => {
    let mounted = true;
    createLibraryPickerCategory(libraries).then((cat) => {
      if (mounted && cat) {
        setLibraryCategory(cat.items);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Tabs: Biblioteka (library templates) + Bloki (block categories)
  const tabs = useMemo<PickerTab[]>(() => {
    const result: PickerTab[] = [];
    if (libraryCategory.length > 0) {
      result.push({ id: "library", label: "Biblioteka", categories: [{ id: "Biblioteka", items: libraryCategory }] });
    }
    result.push({ id: "blocks", label: "Bloki", categories });
    return result;
  }, [libraryCategory, categories]);

  const handleAdd = async (item: PickerItem) => {
    if (item.isLibraryTemplate && item.libraryId && item.templateId) {
      const lib = libraries.find((l) => l.id === item.libraryId);
      if (lib) {
        const blocks = await lib.getBlock({ library: lib, block: { id: item.templateId } as any });
        if (blocks && blocks.length > 0) {
          const parentBlock = parentId ? find(allBlocks, { _id: parentId }) : undefined;
          const pos = getSectionInsertPosition(parentBlock, allBlocks);
          addPredefinedBlock(blocks, undefined, pos);
          pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
          return;
        }
      }
    }
    addCoreBlock({ type: item.type }, parentId ?? null, position);
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };

  // Icon for library items - use a generic section icon
  const renderIcon = (item: PickerItem) => {
    if (item.isLibraryTemplate) {
      return <SectionRoleIcon role="section" className="h-4 w-4" />;
    }
    return <TypeIcon type={item.type} />;
  };

  // Preview for library items - show a placeholder (SectionPreview can't render templates)
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
      searchPlaceholder={t("Search blocks")}
      dialogLabel={t("Add block")}
      tabs={tabs}
      onAdd={handleAdd}
      renderIcon={renderIcon}
      renderPreview={renderPreview}
    />
  );
};