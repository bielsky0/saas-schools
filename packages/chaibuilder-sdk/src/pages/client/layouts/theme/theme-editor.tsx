import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { getThemeGroup, selectedThemeGroupAtom } from "./theme-groups";
import { BorderRadiusEditor } from "./token-editors/border-radius";
import { ColorTokensEditor } from "./token-editors/color-tokens";
import { PlaceholderEditor } from "./token-editors/placeholder";
import { TypographyEditor } from "./token-editors/typography";

export const ThemeEditor = () => {
  const { t } = useTranslation();
  const [selectedGroup] = useAtom(selectedThemeGroupAtom);
  const [darkMode] = useDarkMode();
  const group = getThemeGroup(selectedGroup);

  const renderContent = () => {
    switch (selectedGroup) {
      case "colors":
        return <ColorTokensEditor />;
      case "typography":
        return <TypographyEditor />;
      case "radius-shadows":
        return <BorderRadiusEditor />;
      default:
        return <PlaceholderEditor labelKey={group?.labelKey ?? "Theme"} />;
    }
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="mb-3 flex items-baseline gap-2 border-b border-gray-200 pb-2">
        <span className="text-[11px] text-muted-foreground">
          {t("Theme")} · {darkMode ? t("Dark") : t("Light")}
        </span>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-gray-900">{group ? t(group.labelKey) : t("Theme")}</span>
      </div>
      {renderContent()}
    </div>
  );
};

export default ThemeEditor;
