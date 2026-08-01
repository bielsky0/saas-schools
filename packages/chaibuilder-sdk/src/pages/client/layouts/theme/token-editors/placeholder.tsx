import { HourglassIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export const PlaceholderEditor = ({ labelKey }: { labelKey: string }) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-full bg-muted p-5">
        <HourglassIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
      <p className="text-xs text-muted-foreground">{t("Coming soon")}</p>
    </div>
  );
};

export default PlaceholderEditor;
