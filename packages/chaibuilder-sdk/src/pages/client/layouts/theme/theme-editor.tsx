import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { getThemeGroup, selectedThemeGroupAtom } from "./theme-groups";
import { BorderRadiusEditor } from "./token-editors/border-radius";
import { ButtonsEditor } from "./token-editors/buttons";
import { ColorTokensEditor } from "./token-editors/color-tokens";
import { CourseCardsEditor } from "./token-editors/course-cards";
import { FormFieldsEditor } from "./token-editors/form-fields";
import { LogoFaviconEditor } from "./token-editors/logo-favicon";
import { PlaceholderEditor } from "./token-editors/placeholder";
import { SpacingWidthEditor } from "./token-editors/spacing-width";
import { TypographyEditor } from "./token-editors/typography";

/**
 * Inline editor content for a single theme group (Shopify-style accordion).
 * Reused by `TemplateSettingsTab` (accordion items) and `ThemeEditor` (legacy).
 */
export const ThemeGroupContent = ({ groupId }: { groupId: string }) => {
  const group = getThemeGroup(groupId);

  switch (groupId) {
    case "colors":
      return <ColorTokensEditor />;
    case "typography":
      return <TypographyEditor />;
    case "radius-shadows":
      return <BorderRadiusEditor />;
    case "spacing-width":
      return <SpacingWidthEditor />;
    case "buttons":
      return <ButtonsEditor />;
    case "form-fields":
      return <FormFieldsEditor />;
    case "course-cards":
      return <CourseCardsEditor />;
    case "logo-favicon":
      return <LogoFaviconEditor />;
    default:
      return <PlaceholderEditor labelKey={group?.labelKey ?? "Theme"} />;
  }
};

export const ThemeEditor = () => {
  const { t } = useTranslation();
  const [selectedGroup] = useAtom(selectedThemeGroupAtom);
  const [darkMode] = useDarkMode();
  const group = getThemeGroup(selectedGroup);

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
      <ThemeGroupContent groupId={selectedGroup} />
    </div>
  );
};

export default ThemeEditor;
