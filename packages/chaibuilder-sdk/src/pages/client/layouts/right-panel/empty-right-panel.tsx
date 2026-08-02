import { MousePointerClick } from "lucide-react";
import { useTranslation } from "react-i18next";

const EmptyRightPanel = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
        <MousePointerClick className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">{t("Select a block or page")}</p>
      <p className="max-w-[200px] text-xs text-muted-foreground">
        {t("Select a block on the canvas or a page from the Pages tab to edit its settings")}
      </p>
    </div>
  );
};

export { EmptyRightPanel };
