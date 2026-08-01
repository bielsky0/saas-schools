import { TextIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { FontSelector } from "~/core/components/sidepanels/panels/theme-configuration";
import { useThemeEditor } from "../use-theme-editor";

export const TypographyEditor = () => {
  const { t } = useTranslation();
  const { themeValues, chaiThemeOptions, handleFontChange } = useThemeEditor();

  if (!chaiThemeOptions?.fontFamily) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TextIcon className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Typography")}</span>
      </div>
      {Object.entries(chaiThemeOptions.fontFamily).map(([key, value]: [string, any]) => (
        <FontSelector
          key={key}
          label={key}
          value={
            themeValues.fontFamily[key.replace(/font-/g, "") as keyof typeof themeValues.fontFamily] ||
            value[Object.keys(value)[0]]
          }
          onChange={(newValue: string) => handleFontChange(key, newValue)}
        />
      ))}
    </div>
  );
};

export default TypographyEditor;
