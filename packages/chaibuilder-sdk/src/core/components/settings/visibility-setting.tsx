import { TrashIcon } from "@radix-ui/react-icons";
import { has, isString } from "lodash-es";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageExternalData } from "~/atoms/builder";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Switch } from "~/components/ui/switch";
import { UserDataBinding } from "~/core/components/settings/user-data-binding";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";

export const VisibilitySettings = () => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock();
  const externalData = usePageExternalData();
  const updateBlockProps = useUpdateBlocksProps();
  const [isOpen, setIsOpen] = useState(false);

  const saveExpression = (expression: string) => {
    if (!selectedBlock) return;

    if (!expression || expression.trim() === "") {
      if (isString(selectedBlock._show)) {
        updateBlockProps([selectedBlock._id], { _show: true });
      }
      return;
    }

    updateBlockProps([selectedBlock._id], {
      _show: `{{${expression.trim()}}}`,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const onToggleShow = () => {
    if (!selectedBlock) return;
    const currentShow = has(selectedBlock, "_show") ? selectedBlock._show : true;
    updateBlockProps([selectedBlock._id], {
      _show: !currentShow,
    });
  };

  const removeBinding = () => {
    if (!selectedBlock) return;
    updateBlockProps([selectedBlock._id], { _show: true });
    setIsOpen(false);
  };

  if (!selectedBlock) return null;

  const isBound = isString(selectedBlock._show);
  const currentExpression = isBound
    ? selectedBlock._show.startsWith("{{") && selectedBlock._show.endsWith("}}")
      ? selectedBlock._show.slice(2, -2).trim()
      : selectedBlock._show
    : "";

  return (
    <div className="my-2 flex items-center justify-between">
      <p className="text-xs text-gray-500">{t("Visibility")}</p>
      <div className="group relative">
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <div
              className={`absolute -left-2 -top-1.5 z-10 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-blue-500 transition-all hover:scale-125 ${
                isBound ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            />
          </PopoverTrigger>
          <PopoverContent side="left" className="w-64 p-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium leading-none">{t("Conditional Visibility")}</h4>
                  <p className="text-[10px] text-muted-foreground">{t("Enter a JavaScript expression")}</p>
                </div>
                {isBound && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                    onClick={removeBinding}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <UserDataBinding
                  currentExpression={currentExpression}
                  externalData={externalData as Record<string, any>}
                  onSave={(nextExpression) => {
                    saveExpression(nextExpression);
                    setIsOpen(false);
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Switch
          checked={isBound ? true : has(selectedBlock, "_show") ? selectedBlock._show : true}
          onCheckedChange={onToggleShow}
          disabled={isBound}
        />
      </div>
    </div>
  );
};
