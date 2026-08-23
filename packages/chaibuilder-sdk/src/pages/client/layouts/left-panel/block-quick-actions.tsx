import { has } from "lodash-es";
import { CopyPlus, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { canDeleteBlock, canDuplicateBlock } from "~/core/functions/block-helpers";
import { PERMISSIONS } from "~/core/main";
import { useCopyBlocks } from "~/hooks/use-copy-blockIds";
import { useDuplicateBlocks } from "~/hooks/use-duplicate-blocks";
import { usePermissions } from "~/hooks/use-permissions";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";
import type { ChaiBlock } from "~/types/common";

const actionClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#4A4A4A] hover:bg-black/[.06] hover:text-[#303030] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * Quick actions for the selected block in the panel header: duplicate, copy,
 * hide/show and delete. Mirrors the gating used in `block-floating-actions`.
 */
export const BlockQuickActions = memo(() => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock() as ChaiBlock | undefined;
  const duplicateBlock = useDuplicateBlocks();
  const copyBlocks = useCopyBlocks()[1];
  const removeBlock = useRemoveBlocks();
  const updateBlockProps = useUpdateBlocksProps();
  const { hasPermission } = usePermissions();

  if (!selectedBlock) return null;

  const type = selectedBlock._type ?? "";
  const canDuplicate = hasPermission(PERMISSIONS.ADD_BLOCK) && canDuplicateBlock(type);
  const canDelete = hasPermission(PERMISSIONS.DELETE_BLOCK) && canDeleteBlock(type);

  const isVisible = has(selectedBlock, "_show") ? selectedBlock._show !== false : true;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {canDuplicate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={actionClass}
              aria-label={t("Duplicate")}
              onClick={() => duplicateBlock([selectedBlock._id])}>
              <CopyPlus className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("Duplicate")}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={actionClass}
            aria-label={t("Copy")}
            onClick={() => copyBlocks([selectedBlock._id])}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("Copy")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={actionClass}
            aria-label={t(isVisible ? "Hide" : "Show")}
            onClick={() => updateBlockProps([selectedBlock._id], { _show: !isVisible })}>
            {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t(isVisible ? "Hide" : "Show")}</TooltipContent>
      </Tooltip>
      {canDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={actionClass}
              aria-label={t("Delete block")}
              onClick={() => removeBlock([selectedBlock._id])}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("Delete block")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
BlockQuickActions.displayName = "BlockQuickActions";