import { DropdownMenuItem } from "~/components/ui/dropdown-menu";

import { CardStackIcon } from "@radix-ui/react-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { usePasteBlocks } from "~/hooks/use-paste-blocks";

export const PasteAtRootContextMenu = ({
  parentContext,
  setParentContext,
}: {
  parentContext: { x: number; y: number } | null;
  setParentContext: (value: { x: number; y: number } | null) => void;
}) => {
  const { t } = useTranslation();
  const { canPaste, pasteBlocks } = usePasteBlocks();
  const enableCopyToClipboard = useBuilderProp("flags.copyPaste", true);

  useEffect(() => {
    if (!canPaste("root")) setParentContext(null);
  }, [canPaste("root")]);

  if (!parentContext || !canPaste("root")) return null;

  if (!enableCopyToClipboard) return null;

  return (
    <div className="absolute inset-0">
      <DropdownMenu open={true} onOpenChange={() => setParentContext(null)}>
        <DropdownMenuTrigger className="hidden" />
        <DropdownMenuContent
          className="absolute w-28 p-1 text-xs"
          style={{ top: parentContext.y, left: parentContext.x }}>
          <DropdownMenuItem
            className="flex items-center gap-x-4 text-xs"
            onClick={() => {
              pasteBlocks("root");
              setParentContext(null);
            }}>
            <CardStackIcon /> {t("Paste")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
