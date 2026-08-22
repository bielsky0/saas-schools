import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { SidekickIcon } from "~/core/components/topbar/topbar-icons";
import { PERMISSIONS } from "~/core/main";
import { useAiAssistant } from "~/hooks/use-ask-ai";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { usePermissions } from "~/hooks/use-permissions";
import { useAiDrawerOpen } from "~/hooks/use-theme";

export const AiAssistant = () => {
  const setAiAssistantActive = useAiAssistant();
  const [aiDrawerOpen] = useAiDrawerOpen();
  const askAiCallBack = useBuilderProp("askAiCallBack", null);
  const isAiEnabled = useBuilderProp("flags.ai", false);
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  if (!askAiCallBack || !hasPermission(PERMISSIONS.EDIT_BLOCK) || !isAiEnabled) return null;
  return (
    <Button
      variant="plain"
      size="icon"
      aria-pressed={aiDrawerOpen}
      aria-expanded={aiDrawerOpen}
      title={t("Ask AI")}
      onClick={() => setAiAssistantActive(!aiDrawerOpen)}>
      <SidekickIcon className="h-5 w-5" />
    </Button>
  );
};
