import { useDebouncedCallback } from "@react-hookz/web";
import { get, set } from "lodash-es";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ResetIcon } from "@radix-ui/react-icons";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useSaveWebsiteData } from "~/hooks/use-save-website-data";
import { useTheme, useThemeOptions } from "~/hooks/use-theme";
import { ChaiTheme } from "~/types/chaibuilder-editor-props";

const PREV_THEME_KEY = "chai-builder-previous-theme";

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

/**
 * Shared theme editing logic (token handlers + history/undo), extracted from
 * ThemeConfigPanel so the per-group editors reuse a single implementation.
 */
export const useThemeEditor = () => {
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const { debouncedSaveTheme } = useSaveWebsiteData();
  const chaiThemeOptions = useThemeOptions();
  const [themeValues, setThemeValues] = useTheme();
  const { t } = useTranslation();

  const setThemeWithHistory = React.useCallback(
    (newTheme: ChaiTheme) => {
      const previousTheme = { ...themeValues };
      setPreviousTheme(previousTheme);
      setThemeValues(newTheme);
      debouncedSaveTheme();
      toast.success(t("Theme updated"), {
        action: {
          label: (
            <span className="flex items-center gap-2">
              <ResetIcon className="h-4 w-4" /> {t("Undo")}
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
    [themeValues, setThemeValues, debouncedSaveTheme, t],
  );

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

  return {
    themeValues,
    setThemeValues,
    chaiThemeOptions,
    isDarkMode,
    setIsDarkMode,
    setThemeWithHistory,
    handleColorChange,
    handleFontChange,
    handleBorderRadiusChange,
    debouncedSaveTheme,
  };
};
