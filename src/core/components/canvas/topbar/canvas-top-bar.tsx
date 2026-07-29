import { LightningBoltIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { MoreVertical } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { dataBindingActiveAtom } from "~/atoms/ui";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import { ScalePercent } from "~/core/components/canvas/scale-percent";
import { Breakpoints } from "~/core/components/canvas/topbar/canvas-breakpoints";
import { ClearCanvas } from "~/core/components/canvas/topbar/clear-canvas";
import { DarkMode } from "~/core/components/canvas/topbar/dark-mode";
import { UndoRedo } from "~/core/components/canvas/topbar/undo-redo";
import { useBuilderProp } from "~/hooks/use-builder-prop";

const CanvasTopBar: React.FC = () => {
  const darkModeEnabled = useBuilderProp("flags.darkMode", false);
  const dataBindingEnabled = useBuilderProp("flags.dataBinding", true);
  const [dataBindingActive, setDataBindingActive] = useAtom(dataBindingActiveAtom);
  const { t } = useTranslation();
  const showDarkModeToggle = darkModeEnabled;
  const showDataBindingToggle = dataBindingEnabled;

  return (
    <div className="flex h-10 items-center justify-between px-2">
      <div className="flex h-full space-x-2">{showDarkModeToggle ? <DarkMode /> : null}</div>
      <div className="flex h-full items-center space-x-2">
        <Breakpoints canvas openDelay={400} activeButtonClass="bg-gray-200" />
        <ScalePercent />
        <UndoRedo />
      </div>
      <div className="flex h-full items-center">
        {/* <PageValidation /> */}
        <ClearCanvas />
        {showDataBindingToggle ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="size-2 h-7 w-7 rounded-md p-1">
                <MoreVertical className="h-2 w-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-border text-xs">
              <DropdownMenuItem className="flex items-center gap-2" onSelect={(e) => e.preventDefault()}>
                <LightningBoltIcon className="h-4 w-4 text-gray-500" />
                <span className="flex-1">{t("Data Binding")}</span>
                <Switch checked={dataBindingActive} onCheckedChange={() => setDataBindingActive(!dataBindingActive)} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
};

export { CanvasTopBar };
