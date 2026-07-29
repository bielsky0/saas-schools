import { KeyboardIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

export const HotKeys = () => {
  const { t } = useTranslation();
  const keys: { [key: string]: string } = {
    "ctrl + Z": t("Undo"),
    "ctrl + Y": t("Redo"),
    "ctrl + D": t("Duplicate"),
  };
  const keys2: { [key: string]: string } = {
    // "ctrl + /": "Rename block",
    "ctrl + S": t("Save page"),
    esc: t("Deselect blocks"),
    del: t("Delete block"),
  };
  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className={`mb-2 rounded-lg p-2 transition-colors`} variant="ghost">
              <KeyboardIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>
            <p>{t("Keyboard shortcuts")}</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="border-border sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("Keyboard shortcuts")}</DialogTitle>
        </DialogHeader>
        <div>
          <div className="grid grid-cols-2">
            <div className={"mr-8 flex flex-col space-y-2 border-r border-border"}>
              {Object.keys(keys).map((key) => {
                return (
                  <div key={key} className="flex items-center space-x-4">
                    <Badge variant={"outline"} className={"border border-border p-1 px-2"}>
                      {t(key)}
                    </Badge>
                    <div className="text-muted-foreground">{t(keys[key])}</div>
                  </div>
                );
              })}
            </div>
            <div className={"flex flex-col space-y-2"}>
              {Object.keys(keys2).map((key) => {
                return (
                  <div key={key} className="flex items-center space-x-4">
                    <Badge variant={"outline"} className={"border border-border p-1 px-2"}>
                      {t(key)}
                    </Badge>
                    <div className="text-muted-foreground">{t(keys2[key])}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
