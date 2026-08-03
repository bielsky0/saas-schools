import { LightningBoltIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { CheckCircle, Eraser, ExternalLink, Loader, MoreVertical, Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { dataBindingActiveAtom } from "~/atoms/ui";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import { ScalePercent } from "~/core/components/canvas/scale-percent";
import { AiAssistant } from "~/core/components/canvas/topbar/ai-assistant";
import { Breakpoints } from "~/core/components/canvas/topbar/canvas-breakpoints";
import { ClearCanvas } from "~/core/components/canvas/topbar/clear-canvas";
import { DevicePreview } from "~/core/components/canvas/topbar/device-preview";
import { UndoRedo } from "~/core/components/canvas/topbar/undo-redo";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useSavePage } from "~/hooks/use-save-page";
import { usePageLockStatus } from "~/pages/client/components/page-lock/page-lock-hook";
import PageSelector from "~/pages/client/components/page-selector-in-header";
import TopbarModeSwitcher from "~/pages/client/components/topbar-mode-switcher";
import { PublishButton } from "~/pages/client/components/topbar-right";
import { useGetPageFullSlug, usePrimaryPage } from "~/pages/hooks/pages/use-current-page";

export const SaveStateLabel = () => {
  const { t } = useTranslation();
  const { savePageAsync, saveState } = useSavePage();
  const { isLocked } = usePageLockStatus();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === "UNSAVED") {
        event.preventDefault();
        event.returnValue = false;
      }
    };

    if (saveState === "UNSAVED") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveState]);

  const config = useMemo(() => {
    switch (saveState) {
      case "UNSAVED":
        return { label: t("Draft"), icon: <Save className="h-3.5 w-3.5" />, className: "text-gray-500" };
      case "SAVING":
        return {
          label: t("Saving"),
          icon: <Loader className="h-3.5 w-3.5 animate-spin text-sky-700" />,
          className: "text-gray-500",
        };
      default:
        return {
          label: t("Saved"),
          icon: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
          className: "text-green-600",
        };
    }
  }, [saveState, t]);

  if (isLocked) return null;

  return (
    <button
      type="button"
      onClick={() => savePageAsync()}
      disabled={saveState === "SAVED"}
      title={t("Save draft")}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-transparent ${config.className}`}>
      {config.icon}
      {config.label}
    </button>
  );
};

const LiveLinkMenuItem = () => {
  const { t } = useTranslation();
  const { data: currentPage } = usePrimaryPage();
  const fullUrl = useGetPageFullSlug();
  if (!currentPage?.online) return null;

  return (
    <a href={fullUrl} target="_blank" rel="noopener noreferrer">
      <DropdownMenuItem className="cursor-pointer">
        <ExternalLink className="mr-2 h-4 w-4 text-gray-500" />
        {t("Open live page")}
      </DropdownMenuItem>
    </a>
  );
};

const TopBarOverflowMenu = () => {
  const { t } = useTranslation();
  const darkModeEnabled = useBuilderProp("flags.darkMode", false);
  const dataBindingEnabled = useBuilderProp("flags.dataBinding", true);
  const [dataBindingActive, setDataBindingActive] = useAtom(dataBindingActiveAtom);
  const [darkMode, setDarkMode] = useDarkMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 border-border text-xs">
        <ClearCanvas>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Eraser className="mr-2 h-4 w-4 text-gray-500" />
            {t("Clear canvas")}
          </DropdownMenuItem>
        </ClearCanvas>
        {darkModeEnabled && (
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <span className="flex flex-1 items-center gap-2">
              <span className="flex-1">{t("Dark mode")}</span>
              <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} />
            </span>
          </DropdownMenuItem>
        )}
        {dataBindingEnabled && (
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <span className="flex flex-1 items-center gap-2">
              <LightningBoltIcon className="h-4 w-4 text-gray-500" />
              <span className="flex-1">{t("Data Binding")}</span>
              <Switch checked={dataBindingActive} onCheckedChange={() => setDataBindingActive(!dataBindingActive)} />
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <LiveLinkMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const BuilderTopBar = () => {
  const { isLocked } = usePageLockStatus();

  return (
    <div className="grid h-full w-full grid-cols-3 items-center px-2">
      <div className="flex min-w-0 items-center justify-start">
        <TopbarModeSwitcher />
      </div>
      <div className="flex min-w-0 items-center justify-center">
        <Breakpoints canvas openDelay={400} activeButtonClass="bg-gray-200" />
        <ScalePercent />
        <div className="mx-1 h-4 w-px flex-shrink-0 bg-gray-200" />
        <PageSelector />
      </div>
      <div className="flex items-center justify-end gap-1">
        {isLocked ? null : (
          <>
            <AiAssistant />
            <DevicePreview />
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <UndoRedo />
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <TopBarOverflowMenu />
            <SaveStateLabel />
            <PublishButton />
          </>
        )}
      </div>
    </div>
  );
};

export default BuilderTopBar;
