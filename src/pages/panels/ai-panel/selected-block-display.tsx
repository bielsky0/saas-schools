import { Button } from "~/components/ui/button";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";

import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SelectedBlockDisplayProps {
  onRemove: () => void;
  isLoading?: boolean;
}

export const SelectedBlockDisplay = ({ onRemove, isLoading = false }: SelectedBlockDisplayProps) => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock();
  const blockType = selectedBlock?._type || "Unknown";
  const blockName = selectedBlock?._name || blockType;

  return (
    <>
      <div className="mx-auto flex w-[95%] items-center justify-between rounded-t-md border border-b-0 border-blue-200 bg-blue-50">
        <div className="flex items-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-l rounded-bl-none bg-blue-500 text-xs font-semibold text-white">
            @
          </div>
          <div className="flex w-[95%] flex-col">
            {!selectedBlock ? (
              <span className="text-xs font-medium text-blue-900">&nbsp;{t("Context: Entire Page")}</span>
            ) : (
              <>
                <span className="truncate text-xs font-medium text-blue-900">
                  &nbsp;{t("Context: ")}&nbsp;{blockName}
                </span>
              </>
            )}
          </div>
        </div>
        {selectedBlock && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={isLoading}
            className="h-6 w-6 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
            title="Remove block from context">
            <X size={14} />
          </Button>
        )}
      </div>
    </>
  );
};
