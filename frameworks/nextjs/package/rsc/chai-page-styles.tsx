import { applyDesignTokens, getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import { getFontStyles } from "@chaibuilder/sdk/runtime";
import { ChaiDesignTokens, ChaiTheme } from "@chaibuilder/sdk/types";
import { get } from "lodash";
import { ChaiBuilder } from "../ChaiBuilder";
import { ChaiFullPage } from "../types";

export const ChaiPageStyles = async (props: { page: ChaiFullPage }) => {
  const { page } = props;
  const siteSettings = await ChaiBuilder.getSiteSettings();

  if (!!get(siteSettings, "error")) {
    console.log("Site Settings Error: ", siteSettings);
  }

  const theme = get(siteSettings, "theme", {}) as ChaiTheme;
  const designTokens = get(siteSettings, "designTokens", {}) as ChaiDesignTokens;
  const themeCssVariables = getChaiThemeCssVariables({ theme });
  const pageBlocks = applyDesignTokens(page.blocks ?? [], designTokens);
  const styles = page ? await ChaiBuilder.getBlocksStyles(pageBlocks) : null;
  const bodyFont = get(theme, "fontFamily.body", "Arial");
  const headingFont = get(theme, "fontFamily.heading", "Arial");
  const { fontStyles, preloads } = await getFontStyles(headingFont, bodyFont);

  return (
    <>
      {preloads.length > 0 &&
        preloads.map((preload) => (
          <link key={preload} rel="preload" href={preload} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      <style id="theme-variables" dangerouslySetInnerHTML={{ __html: themeCssVariables }} />
      {styles ? <style id="page-styles" dangerouslySetInnerHTML={{ __html: styles }} /> : null}
      {fontStyles ? <style id="fonts-styles" dangerouslySetInnerHTML={{ __html: fontStyles }} /> : null}
    </>
  );
};
