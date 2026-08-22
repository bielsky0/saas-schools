import { LightningBoltIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { CheckCircle, Eraser, ExternalLink, Loader, Save } from "lucide-react";
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
import { WEB_BREAKPOINTS } from "~/core/components/canvas/topbar/canvas-breakpoints";
import { ClearCanvas } from "~/core/components/canvas/topbar/clear-canvas";
import { DevicePreview } from "~/core/components/canvas/topbar/device-preview";
import { RedoButton, UndoButton } from "~/core/components/canvas/topbar/undo-redo";
import { MenuIcon } from "~/core/components/topbar/topbar-icons";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useSavePage } from "~/hooks/use-save-page";
import { useCanvasDisplayWidth } from "~/hooks/use-screen-size-width";
import { getBreakpointValue } from "~/core/functions/common-functions";
import { usePageLockStatus } from "~/pages/client/components/page-lock/page-lock-hook";
import PageSelector from "~/pages/client/components/page-selector-in-header";
import TopbarModeSwitcher from "~/pages/client/components/topbar-mode-switcher";
import { InspectorToggle } from "~/pages/client/components/topbar/inspector-toggle";
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
        return { label: t("Save"), icon: <Save className="h-3.5 w-3.5" />, disabled: false };
      case "SAVING":
        return {
          label: t("Saving"),
          icon: <Loader className="h-3.5 w-3.5 animate-spin" />,
          disabled: true,
        };
      default:
        return {
          label: t("Saved"),
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          disabled: true,
        };
    }
  }, [saveState, t]);

  if (isLocked) return null;

  return (
    <button
      type="button"
      onClick={() => savePageAsync()}
      disabled={config.disabled}
      title={t("Save draft")}
      className={`flex h-8 items-center gap-1.5 rounded-[4px] bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-primary`}>
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

const MenuBreakpoints = () => {
  const { t } = useTranslation();
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useCanvasDisplayWidth();
  const breakpoint = getBreakpointValue(canvasDisplayWidth).toLowerCase();

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-0.5">
        {WEB_BREAKPOINTS.map((bp) => (
          <button
            key={bp.breakpoint}
            type="button"
            onClick={() => setCanvasDisplayWidth(bp.width)}
            title={t(bp.title)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
              bp.breakpoint === breakpoint ? "bg-gray-200 text-gray-900" : "text-gray-500"
            }`}>
            {bp.icon}
          </button>
        ))}
      </div>
      <ScalePercent />
    </div>
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
        <Button
          variant="plain"
          size="icon"
          aria-label={t("More options")}
          aria-expanded={false}
          className="border border-gray-200">
          <MenuIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 border-border text-xs">
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Screen sizes")}
        </div>
        <MenuBreakpoints />
        <DropdownMenuSeparator />
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
    <div className="grid h-full w-full grid-cols-3 items-center px-3">
      <div className="flex min-w-0 items-center justify-start">
        <TopbarModeSwitcher />
      </div>
      <div className="flex min-w-0 items-center justify-center">
        <PageSelector />
      </div>
      <div className="flex items-center justify-end gap-0.5">
        {isLocked ? null : (
          <>
            <AiAssistant />
            <InspectorToggle />
            <DevicePreview />
            <div className="mx-1 h-6 w-px flex-shrink-0 bg-gray-200" />
            <UndoButton />
            <RedoButton />
            <div className="mx-1 h-6 w-px flex-shrink-0 bg-gray-200" />
            <TopBarOverflowMenu />
            <div className="mx-1 h-6 w-px flex-shrink-0 bg-gray-200" />
            <PublishButton />
          </>
        )}
      </div>
    </div>
  );
};

export default BuilderTopBar;
