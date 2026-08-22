import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { InspectorIcon } from "~/core/components/topbar/topbar-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { inspectorEnabledAtom } from "~/pages/client/layouts/mobile/mobile-sheet-states";

export const InspectorToggle = () => {
  const { t } = useTranslation();
  const [inspectorEnabled, setInspectorEnabled] = useAtom(inspectorEnabledAtom);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="plain"
          size="icon"
          aria-pressed={inspectorEnabled}
          aria-label={inspectorEnabled ? t("Deactivate inspector") : t("Open inspector")}
          onClick={() => setInspectorEnabled(!inspectorEnabled)}>
          <InspectorIcon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("Inspector")}</TooltipContent>
    </Tooltip>
  );
};

export default InspectorToggle;