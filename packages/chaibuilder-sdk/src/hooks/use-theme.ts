import { atom, useAtom } from "jotai";
import { isEmpty } from "lodash-es";
import { useMemo } from "react";
import { defaultThemeOptions, defaultThemeValues } from "~/hooks/default-theme-options";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { ChaiBorderRadiusValue, ChaiTheme, ChaiThemeOptions } from "~/types/chaibuilder-editor-props";

export const getDefaultThemeValues = (options: ChaiThemeOptions = defaultThemeOptions): ChaiTheme => {
  const themeValues: ChaiTheme = defaultThemeValues;

  if (options.fontFamily) {
    themeValues.fontFamily = Object.entries(options.fontFamily).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key.replace("font-", "")]: value,
      }),
      themeValues.fontFamily,
    );
  }

  // @ts-expect-error - borderRadius is a string in options but ChaiBorderRadiusValue in themeValues
  themeValues.borderRadius = options.borderRadius as ChaiBorderRadiusValue;

  if (options.colors) {
    themeValues.colors = options.colors.reduce((acc, colorGroup) => {
      Object.entries(colorGroup.items).forEach(([key, values]) => {
        if (key in acc) {
          acc[key as keyof typeof acc] = values;
        }
      });
      return acc;
    }, themeValues.colors) as ChaiTheme["colors"];
  }

  return themeValues;
};

// Create a new atom for changeable theme values, initialized with default values
export const chaiThemeValuesAtom = atom<ChaiTheme | Partial<ChaiTheme>>({});

export const useTheme = () => {
  const options = useThemeOptions();
  const defaultThemeValues = useMemo(() => getDefaultThemeValues(options), [options]);
  const theme = useBuilderProp("theme", {});
  const [chaiTheme, setChaiTheme] = useAtom(chaiThemeValuesAtom);

  const themeValues = useMemo(
    () =>
      ({
        ...defaultThemeValues,
        ...(!isEmpty(theme) && theme),
        ...(!isEmpty(chaiTheme) && chaiTheme),
      }) as ChaiTheme,
    [defaultThemeValues, theme, chaiTheme],
  );
  return [themeValues, setChaiTheme] as const;
};

export const useThemeOptions = () => {
  const getThemeOptions = useBuilderProp("themeOptions", (themeOptions: ChaiThemeOptions) => themeOptions);
  const defaultOptions = useMemo(() => getThemeOptions(defaultThemeOptions), [getThemeOptions]);
  return defaultOptions as ChaiThemeOptions;
};

const rightPanelAtom = atom<"block" | "theme" | "ai" | "settings" | "design-tokens" | "page" | "template">("block");
export const useRightPanel = () => {
  return useAtom(rightPanelAtom);
};

/**
 * Controls the bottom slide-up settings panel inside the left panel (F7).
 * "block" → SettingsPanel, "page" → PageSettings, "template" → TemplateSettings,
 * "theme" → ThemeEditor, null → hidden (tabs take full height).
 */
export type LeftPanelBottomTab = "block" | "page" | "template" | "theme";

const leftPanelBottomAtom = atom<LeftPanelBottomTab | null>(null);
leftPanelBottomAtom.debugLabel = "leftPanelBottomAtom";
export const useLeftPanelBottom = () => {
  return useAtom(leftPanelBottomAtom);
};

const aiDrawerOpenAtom = atom<boolean>(false);
aiDrawerOpenAtom.debugLabel = "aiDrawerOpenAtom";
export const useAiDrawerOpen = () => {
  return useAtom(aiDrawerOpenAtom);
};

/**
 * Controls which view is rendered in the left panel (Shopify-like topbar modes).
 * "sections" → section/block tree, "template-settings" → theme tab (colors/typography),
 * "seo" → inline SEO panel.
 */
export type LeftPanelMode = "sections" | "template-settings" | "seo";

const leftPanelModeAtom = atom<LeftPanelMode>("sections");
leftPanelModeAtom.debugLabel = "leftPanelModeAtom";
export const useLeftPanelMode = () => {
  return useAtom(leftPanelModeAtom);
};

const activeSettingsTabAtom = atom<"settings" | "styles" | "advanced" | "ai">("settings");
export const useActiveSettingsTab = () => {
  return useAtom(activeSettingsTabAtom);
};
