import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { AiIcon } from "~/core/components/ai/ai-icon";
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
      variant={aiDrawerOpen ? "default" : "ghost"}
      size="icon"
      className="h-8 w-8 rounded-md"
      title={t("Ask AI")}
      onClick={() => setAiAssistantActive(!aiDrawerOpen)}>
      <AiIcon className="h-4 w-4" />
    </Button>
  );
};
