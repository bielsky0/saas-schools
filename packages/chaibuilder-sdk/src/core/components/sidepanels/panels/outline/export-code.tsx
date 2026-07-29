import { DownloadIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { pubsub } from "~/core/pubsub";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";

export const ExportCode = () => {
  const { t } = useTranslation();
  const [selectedIds] = useSelectedBlockIds();
  const exportCodeEnabled = useBuilderProp("flags.exportCode", false);

  if (!exportCodeEnabled) {
    return null;
  }

  return (
    <DropdownMenuItem
      className="flex items-center gap-x-4 text-xs"
      onClick={() => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_EXPORT_CODE, selectedIds)}>
      <DownloadIcon /> {t("Export")}
    </DropdownMenuItem>
  );
};
