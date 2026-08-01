import { MixerHorizontalIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { capitalize, get } from "lodash-es";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { ColorPickerInput } from "~/core/components/sidepanels/panels/theme-configuration";
import { claude, defaultShadcnPreset, solarized, supabase, twitter } from "~/core/constants/THEME_PRESETS";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { ChaiTheme } from "~/types/chaibuilder-editor-props";
import { useThemeEditor } from "../use-theme-editor";

const DEFAULT_THEME_PRESET: Record<string, ChaiTheme>[] = [
  { shadcn_default: defaultShadcnPreset },
  { twitter_theme: twitter },
  { solarized_theme: solarized },
  { claude_theme: claude },
  { supabase_theme: supabase },
];

const renderColorLabel = (key: string) =>
  key
    .split(/(?=[A-Z])/)
    .join(" ")
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") +
  (!key.toLowerCase().includes("foreground") &&
  !key.toLowerCase().includes("border") &&
  !key.toLowerCase().includes("input") &&
  !key.toLowerCase().includes("ring") &&
  !key.toLowerCase().includes("background")
    ? " Background"
    : "");

export const ColorTokensEditor = () => {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");
  const themePresets = useBuilderProp("themePresets", []) as Record<string, ChaiTheme>[];
  const darkModeEnabled = useBuilderProp("flags.darkMode", false);
  const {
    themeValues,
    chaiThemeOptions,
    isDarkMode,
    setIsDarkMode,
    setThemeWithHistory,
    handleColorChange,
  } = useThemeEditor();

  const availablePresets =
    themePresets && themePresets.length > 0 ? themePresets : DEFAULT_THEME_PRESET;

  const applyPreset = () => {
    const preset = availablePresets.find((p) => Object.keys(p)[0] === selectedPreset);
    if (preset) {
      const newThemeValues = Object.values(preset)[0] as ChaiTheme;
      if (
        newThemeValues &&
        typeof newThemeValues === "object" &&
        "fontFamily" in newThemeValues &&
        "borderRadius" in newThemeValues &&
        "colors" in newThemeValues
      ) {
        setThemeWithHistory(newThemeValues);
        setSelectedPreset("");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("Presets")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-[70%]">
          <Select value={selectedPreset} onValueChange={setSelectedPreset}>
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder={t("Select preset")} />
            </SelectTrigger>
            <SelectContent>
              {availablePresets.map((preset: any) => {
                const key = Object.keys(preset)[0];
                return (
                  <SelectItem key={key} value={key}>
                    {capitalize(key.replaceAll("_", " "))}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-[25%] text-sm" disabled={!selectedPreset} onClick={applyPreset}>
          {t("Apply")}
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MixerHorizontalIcon className="h-3 w-3 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{t("Colors")}</span>
        </div>
        {darkModeEnabled && (
          <div className="flex items-center gap-1.5">
            <SunIcon className="h-3.5 w-3.5 text-gray-500" />
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked: boolean) => setIsDarkMode(checked)}
              aria-label={t("Toggle dark mode")}
            />
            <MoonIcon className="h-3.5 w-3.5 text-gray-500" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {chaiThemeOptions?.colors &&
          chaiThemeOptions.colors.map((group: any) => (
            <div key={group.group} className="space-y-0.5">
              <Label className="text-[11px] font-medium text-gray-500">{group.group}</Label>
              <div className="space-y-0.5">
                {Object.entries(group.items).map(([key]) => {
                  const themeColor = get(themeValues, `colors.${key}.${isDarkMode ? 1 : 0}`);
                  if (!themeColor) return null;
                  return (
                    <div key={key} id={`theme-${key}`} className="flex items-center gap-x-2 py-0.5">
                      <ColorPickerInput
                        value={themeColor as string}
                        onChange={(newValue: string) => handleColorChange(key, newValue)}
                      />
                      <Label className="text-xs font-normal leading-tight text-gray-700">
                        {renderColorLabel(key)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      <Separator />

      <p className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800">
        {t("Sections can override the background locally — the section name shows an overridden badge in the tree")}
      </p>
    </div>
  );
};

export default ColorTokensEditor;
