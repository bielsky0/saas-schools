import { componentTokensToCssVars, getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import type { ChaiTheme } from "@chaibuilder/sdk/types";
import { withTenant } from "@/lib/db/tenant";
import { getTheme } from "@/features/cms/theme-data";
import { getActiveBuilderThemeAndTokens } from "@/features/cms/builder-theme-data";

const GOOGLE_FONTS: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  Geist: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap",
  Lato: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
  Montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
};

const DEFAULT_THEME = {
  fontPrimary: "system-ui",
  fontHeading: "Inter",
  colorPrimary: "#2563eb",
  colorSecondary: "#8b5cf6",
  borderRadius: "0.5rem",
};

function buildChaiTheme(t: typeof DEFAULT_THEME): ChaiTheme {
  return {
    fontFamily: { heading: t.fontHeading, body: t.fontPrimary },
    borderRadius: t.borderRadius,
    colors: {
      background: ["#FFFFFF", "#121212"],
      foreground: ["#0A0A0B", "#FAFAFA"],
      primary: [t.colorPrimary, t.colorPrimary],
      "primary-foreground": ["#FFFFFF", "#FFFFFF"],
      secondary: [t.colorSecondary, t.colorSecondary],
      "secondary-foreground": ["#FFFFFF", "#FFFFFF"],
      muted: ["#F4F4F5", "#374151"],
      "muted-foreground": ["#71717A", "#9CA3AF"],
      accent: ["#F4F4F5", "#374151"],
      "accent-foreground": ["#18181B", "#FFFFFF"],
      destructive: ["#DC2626", "#EF4444"],
      "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
      border: ["#E4E4E7", "#374151"],
      input: ["#E4E4E7", "#374151"],
      ring: [t.colorPrimary, t.colorPrimary],
      card: ["#FFFFFF", "#242424"],
      "card-foreground": ["#0A0A0B", "#FAFAFA"],
      popover: ["#FFFFFF", "#242424"],
      "popover-foreground": ["#0A0A0B", "#FAFAFA"],
    },
  };
}

type Props = {
  organizationId: string;
  children: React.ReactNode;
};

export async function ThemeInjector({ organizationId, children }: Props) {
  if (!organizationId) {
    return <>{children}</>;
  }

  // 1. Try the builder theme (full ChaiTheme from JSONB) — one query returns
  //    both the theme and the component tokens (no two-query tx fragility).
  const activeTheme = await withTenant(organizationId, async (tx) =>
    getActiveBuilderThemeAndTokens(tx, organizationId),
  );
  const builderTheme = activeTheme?.theme ?? null;
  const componentTokens = activeTheme?.componentTokens ?? null;

  const componentCss = componentTokensToCssVars(componentTokens ?? {});

  if (builderTheme) {
    const cssVars = getChaiThemeCssVariables({ theme: builderTheme });
    const forcedCss = `${cssVars}\n:root { --radius: ${builderTheme.borderRadius} !important; }`;

    const fontUrls = [builderTheme.fontFamily.heading, builderTheme.fontFamily.body]
      .filter((f) => f in GOOGLE_FONTS)
      .map((f) => GOOGLE_FONTS[f]);

    return (
      <>
        {fontUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} />
        ))}
        <style dangerouslySetInnerHTML={{ __html: forcedCss }} />
        {componentCss && <style dangerouslySetInnerHTML={{ __html: componentCss }} />}
        {children}
      </>
    );
  }

  // 2. Fallback: Payload CMS theme table (legacy ThemeRow)
  const theme = await withTenant(organizationId, async (tx) =>
    getTheme(tx, organizationId),
  );

  const t = {
    fontPrimary: theme?.fontPrimary ?? DEFAULT_THEME.fontPrimary,
    fontHeading: theme?.fontHeading ?? DEFAULT_THEME.fontHeading,
    colorPrimary: theme?.colorPrimary ?? DEFAULT_THEME.colorPrimary,
    colorSecondary: theme?.colorSecondary ?? DEFAULT_THEME.colorSecondary,
    borderRadius: theme?.borderRadius ?? DEFAULT_THEME.borderRadius,
  };

  const chaiTheme = buildChaiTheme(t);
  const cssVars = getChaiThemeCssVariables({ theme: chaiTheme });
  const forcedCss = `${cssVars}\n:root { --radius: ${t.borderRadius} !important; }`;

  const fontUrls = [t.fontHeading, t.fontPrimary]
    .filter((f) => f in GOOGLE_FONTS)
    .map((f) => GOOGLE_FONTS[f]);

  return (
    <>
      {fontUrls.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: forcedCss }} />
      {componentCss && <style dangerouslySetInnerHTML={{ __html: componentCss }} />}
      <script
        dangerouslySetInnerHTML={{
          __html: `console.log("[ThemeInjector] borderRadius:", ${JSON.stringify(t.borderRadius)});console.log("[ThemeInjector] CSS:", ${JSON.stringify(forcedCss)});`,
        }}
      />
      {children}
    </>
  );
}
