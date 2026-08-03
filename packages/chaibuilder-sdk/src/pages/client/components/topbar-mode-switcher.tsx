import { ArrowLeft, Layers, Settings } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/core/functions/common-functions";
import { LeftPanelMode, useLeftPanelMode } from "~/hooks/use-theme";
import { usePagesProp } from "~/pages/hooks/project/use-builder-prop";
import { SeoIcon } from "./seo-icon";

const MODES: { id: LeftPanelMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "sections", label: "Sections", Icon: Layers },
  { id: "template-settings", label: "Template settings", Icon: Settings },
  { id: "seo", label: "SEO", Icon: SeoIcon },
];

export const BackToDashboard = () => {
  const { t } = useTranslation();
  const backUrl = usePagesProp("getBackUrl", "/dashboard");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          aria-label={t("Back to dashboard")}
          onClick={() => {
            window.location.href = backUrl;
          }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("Back to dashboard")}</TooltipContent>
    </Tooltip>
  );
};

/**
 * Left-side topbar tab group (Shopify-like). Only one mode is active at a time
 * and drives what is rendered in the left panel. Cmd/Ctrl+Shift+2 opens template settings.
 */
export const TopbarModeSwitcher = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useLeftPanelMode();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "2") {
        e.preventDefault();
        setMode("template-settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setMode]);

  return (
    <div className="flex items-center gap-0.5">
      <BackToDashboard />
      <div className="mx-1 h-4 w-px flex-shrink-0 bg-gray-200" />
      {MODES.map(({ id, label, Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t(label)}
              aria-pressed={mode === id}
              className={cn("h-8 w-8 rounded-md", mode === id && "bg-gray-200 text-gray-900")}
              onClick={() => setMode(id)}>
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t(label)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default TopbarModeSwitcher;
