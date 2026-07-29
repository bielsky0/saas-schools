import { useMemo } from "react";
import { getChaiThemeCssVariables } from "~/render";
import { ChaiTheme } from "~/types";

export const CssThemeVariables = ({ theme }: { theme: ChaiTheme }) => {
  const themeVariables = useMemo(() => {
    return getChaiThemeCssVariables({ theme });
  }, [theme]);
  return <style id="chai-theme" dangerouslySetInnerHTML={{ __html: themeVariables }} />;
};
