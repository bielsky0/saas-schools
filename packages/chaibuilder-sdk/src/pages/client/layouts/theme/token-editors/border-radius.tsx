import { CornerTopRightIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { BorderRadiusInput } from "~/core/components/sidepanels/panels/theme-configuration";
import { useThemeEditor } from "../use-theme-editor";

export const BorderRadiusEditor = () => {
  const { t } = useTranslation();
  const { themeValues, handleBorderRadiusChange } = useThemeEditor();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CornerTopRightIcon className="h-3 w-3 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{t("Border Radius")}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {themeValues.borderRadius}
        </Badge>
      </div>
      <BorderRadiusInput value={themeValues.borderRadius} onChange={handleBorderRadiusChange} />
      <p className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800">
        {t("Shadows coming soon")}
      </p>
    </div>
  );
};

export default BorderRadiusEditor;
