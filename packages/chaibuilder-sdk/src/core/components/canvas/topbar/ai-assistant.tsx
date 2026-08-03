import { useTranslation } from "react-i18next";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
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
    <div className="flex items-center space-x-2">
      <Label htmlFor="ai-assistant" className="flex items-center gap-x-1 text-sm text-yellow-600">
        <AiIcon className="h-4 w-4" />
        {t("AI Assistant")}
      </Label>
      <Switch
        className={"scale-90"}
        checked={aiDrawerOpen}
        onCheckedChange={(state) => {
          setAiAssistantActive(state);
        }}
        id="ai-assistant"
      />
    </div>
  );
};
