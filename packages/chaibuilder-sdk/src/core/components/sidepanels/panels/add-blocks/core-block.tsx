import { BoxIcon } from "@radix-ui/react-icons";
import { capitalize, has, isFunction, kebabCase } from "lodash-es";
import { createElement } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useDragAndDrop, useIsDragAndDropEnabled } from "~/core/components/canvas/dnd/drag-and-drop/hooks";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useAddBlock } from "~/hooks/use-add-block";
import { syncBlocksWithDefaultProps } from "~/runtime";

export const CoreBlock = ({
  block,
  disabled,
  parentId,
  position,
}: {
  block: any;
  disabled: boolean;
  parentId?: string;
  position?: number;
}) => {
  const { type, icon, label, disabledReason } = block;
  // Use block.disabled if passed (for partial blocks with circular dep check)
  const isDisabled = disabled || block.disabled;
  const { addCoreBlock, addPredefinedBlock } = useAddBlock();
  const addBlockToPage = () => {
    if (has(block, "blocks")) {
      const blocks = isFunction(block.blocks) ? block.blocks() : block.blocks;
      addPredefinedBlock(syncBlocksWithDefaultProps(blocks), parentId || null, position);
    } else {
      addCoreBlock(block, parentId || null, position);
    }
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };
  const isDragAndDropEnabled = useIsDragAndDropEnabled();

  const { t } = useTranslation();
  const { onDragStart, onDragEnd } = useDragAndDrop();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={isDisabled}
            onClick={addBlockToPage}
            type="button"
            onDragStart={(ev) => !isDisabled && onDragStart(ev, { ...block, label: label, icon: icon })}
            onDragEnd={onDragEnd}
            draggable={isDragAndDropEnabled && !isDisabled}
            className={`${kebabCase(`chai-block-${type}`)} ${isDragAndDropEnabled && !isDisabled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} space-y-2 rounded-lg border border-border p-3 text-center hover:bg-slate-300/50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:text-white dark:hover:bg-slate-800/50 dark:disabled:bg-gray-900 dark:disabled:text-foreground ${
              isDisabled ? "opacity-50" : ""
            }`}>
            {createElement(icon || BoxIcon, { className: "w-4 h-4 mx-auto", "data-add-core-block-icon": type })}
            <p className="truncate text-xs">{capitalize(t(label || type))}</p>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isDisabled && disabledReason ? disabledReason : t(label || type)}</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
};
