import {
  CornerTopRightIcon,
  MixerHorizontalIcon,
  MoonIcon,
  ResetIcon,
  SunIcon,
  TextIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { useDebouncedCallback } from "@react-hookz/web";
import { capitalize, get, set } from "lodash-es";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  BorderRadiusInput,
  ColorPickerInput,
  FontSelector,
} from "~/core/components/sidepanels/panels/theme-configuration";
import { cn } from "~/core/functions/common-functions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { usePermissions } from "~/hooks/use-permissions";
import { useSaveWebsiteData } from "~/hooks/use-save-website-data";
import { useTheme, useThemeOptions } from "~/hooks/use-theme";
import { ChaiTheme } from "~/types/chaibuilder-editor-props";

import { lazy, Suspense } from "react";
import { Badge } from "~/components/ui/badge";
import { claude, defaultShadcnPreset, solarized, supabase, twitter } from "~/core/constants/THEME_PRESETS";
import { useRegisteredFonts } from "~/runtime";

const LazyCssImportModal = lazy(() =>
  import("./css-import-modal").then((module) => ({ default: module.CssImportModal })),
);

// Local storage key for storing previous theme
const PREV_THEME_KEY = "chai-builder-previous-theme";

// Default theme preset
const DEFAULT_THEME_PRESET: Record<string, ChaiTheme>[] = [
  { shadcn_default: defaultShadcnPreset },
  { twitter_theme: twitter },
  { solarized_theme: solarized },
  { claude_theme: claude },
  { supabase_theme: supabase },
];

const setPreviousTheme = (theme: ChaiTheme) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREV_THEME_KEY, JSON.stringify(theme));
  } catch (error) {
    console.warn("Failed to save previous theme to localStorage:", error);
  }
};

const clearPreviousTheme = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREV_THEME_KEY);
  } catch (error) {
    console.warn("Failed to clear previous theme from localStorage:", error);
  }
};

interface ThemeConfigProps {
  className?: string;
}

const ThemeConfigPanel: React.FC<ThemeConfigProps> = React.memo(({ className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const themePresets = useBuilderProp("themePresets", {}) as Record<string, ChaiTheme>[];
  const { hasPermission } = usePermissions();
  const { debouncedSaveTheme } = useSaveWebsiteData();
  const importThemeEnabled = useBuilderProp("flags.importTheme", true);
  const darkModeEnabled = useBuilderProp("flags.darkMode", false);
  const availableFonts = useRegisteredFonts();

  if (!themePresets || themePresets.length === 0) {
    DEFAULT_THEME_PRESET.map((preset) => {
      themePresets.push(preset);
    });
  }

  const [themeValues, setThemeValues] = useTheme();
  const chaiThemeOptions = useThemeOptions();
  const { t } = useTranslation();
  const setThemeWithHistory = React.useCallback(
    (newTheme: ChaiTheme) => {
      const previousTheme = { ...themeValues };
      setPreviousTheme(previousTheme);
      setThemeValues(newTheme);
      debouncedSaveTheme();
      toast.success("Theme updated", {
        action: {
          label: (
            <span className="flex items-center gap-2">
              <ResetIcon className="h-4 w-4" /> Undo
            </span>
          ),
          onClick: () => {
            setThemeValues(previousTheme);
            clearPreviousTheme();
            toast.dismiss();
          },
        },
        closeButton: true,
        duration: 15000,
      });
    },
    [themeValues, setThemeValues, debouncedSaveTheme],
  );

  const applyPreset = () => {
    const preset = (themePresets as any[]).find((p) => Object.keys(p)[0] === selectedPreset);
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
      } else {
        console.error("Invalid preset structure:", newThemeValues);
      }
    } else {
      console.error("Preset not found:", selectedPreset);
    }
  };

  const handleCssImport = (importedTheme: ChaiTheme) => {
    // Apply the imported theme values directly to the current theme
    setThemeWithHistory(importedTheme);
    setSelectedPreset("");
  };

  const handleFontChange = useDebouncedCallback(
    (key: string, newValue: string) => {
      setThemeValues(() => ({
        ...themeValues,
        fontFamily: {
          ...themeValues.fontFamily,
          [key.replace(/font-/g, "")]: newValue,
        },
      }));
      debouncedSaveTheme();
    },
    [themeValues, debouncedSaveTheme],
    200,
  );

  const handleBorderRadiusChange = React.useCallback(
    (value: string) => {
      setThemeValues(() => ({
        ...themeValues,
        borderRadius: `${value}px`,
      }));
      debouncedSaveTheme();
    },
    [themeValues, setThemeValues, debouncedSaveTheme],
  );

  const handleColorChange = useDebouncedCallback(
    (key: string, newValue: string) => {
      setThemeValues(() => {
        const prevColor = get(themeValues, `colors.${key}`)! as [string, string];
        if (!isDarkMode) {
          set(prevColor, 0, newValue);
        } else {
          set(prevColor, 1, newValue);
        }
        return {
          ...themeValues,
          colors: {
            ...themeValues.colors,
            [key]: prevColor,
          },
        };
      });
      debouncedSaveTheme();
    },
    [themeValues, debouncedSaveTheme],
    200,
  );

  const renderColorGroup = (group: any) => (
    <div className="grid grid-cols-1">
      {Object.entries(group.items).map(([key]) => {
        const themeColor = get(themeValues, `colors.${key}.${isDarkMode ? 1 : 0}`);
        if (!themeColor) return null;
        return (
          <div key={key} id={`theme-${key}`} className="mt-1 flex items-center gap-x-2">
            <ColorPickerInput
              value={themeColor as string}
              onChange={(newValue: string) => handleColorChange(key, newValue)}
            />
            <Label className="text-xs font-normal leading-tight">
              {key
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
                  : "")}
            </Label>
          </div>
        );
      })}
    </div>
  );

  if (!hasPermission("edit_theme")) {
    return (
      <div className="relative w-full">
        <div className={cn("no-scrollbar h-full w-full overflow-y-auto text-center", className)}>
          <div className="mt-10 h-full items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">
              {t("You don't have permission to edit the theme. Please contact your administrator to get access.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className={cn("no-scrollbar h-full w-full overflow-y-auto", className)}>
        {themePresets.length > 0 && (
          <div className="mx-0 my-2 flex flex-col gap-1 py-2">
            <div className="flex w-full items-center justify-between">
              <Label className="text-sm">{t("Presets")}</Label>
              <div className="flex gap-2">
                {importThemeEnabled && (
                  <Button className="px-1" variant="link" size="sm" onClick={() => setIsImportModalOpen(true)}>
                    <UploadIcon className="h-4 w-4" />
                    {t("Import theme")}
                  </Button>
                )}
              </div>
            </div>
            {/* Presets Tab */}
            <div className="flex items-center gap-2 px-0">
              <div className="w-[70%]">
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder={t("Select preset")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(themePresets) &&
                      themePresets.map((preset: any) => {
                        const key = Object.keys(preset)[0];
                        const label = key.replaceAll("_", " ");
                        return (
                          <SelectItem key={key} value={key}>
                            {capitalize(label)}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[25%]">
                <Button className="w-full text-sm" disabled={!selectedPreset} onClick={applyPreset}>
                  {t("Apply")}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className={cn("my-2 space-y-3", className)}>
          {availableFonts.length > 0 ? (
            <>
              {/* Fonts Section */}
              <div className="flex items-center gap-2">
                <TextIcon className="h-3 w-3 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">{t("Typography")}</span>
              </div>
              {chaiThemeOptions?.fontFamily && (
                <div className="space-y-2">
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
              )}
              <Separator />
            </>
          ) : (
            ""
          )}

          {/* Border Radius Section */}
          {chaiThemeOptions?.borderRadius && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CornerTopRightIcon className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{t("Border Radius")}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {themeValues.borderRadius}
                </Badge>
              </div>
              <div className="flex items-center gap-4 py-2">
                <BorderRadiusInput value={themeValues.borderRadius} onChange={handleBorderRadiusChange} />
              </div>
            </div>
          )}

          <Separator />

          {/* Colors Section with Mode Switch */}
          {chaiThemeOptions?.colors && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MixerHorizontalIcon className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{t("Colors")}</span>
                </div>
                {darkModeEnabled && (
                  <div className="flex items-center gap-2">
                    <SunIcon className="h-4 w-4" />
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={(checked: boolean) => setIsDarkMode(checked)}
                      aria-label={t("Toggle dark mode")}
                      className="mx-1"
                    />
                    <MoonIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {chaiThemeOptions.colors.map((group) => (
                  <div key={group.group}>{renderColorGroup(group)}</div>
                ))}
              </div>
            </div>
          )}
          <Suspense fallback={<div>{t("Loading...")}</div>}>
            {isImportModalOpen && importThemeEnabled && (
              <LazyCssImportModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onImport={handleCssImport}
              />
            )}
          </Suspense>
        </div>
        <br />
        <br />
        <br />
        <br />
      </div>
    </div>
  );
});

export default ThemeConfigPanel;
