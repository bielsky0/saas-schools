import aspectRatio from "@tailwindcss/aspect-ratio";
import containerQueries from "@tailwindcss/container-queries";
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import { filter, get, has } from "lodash-es";
import React, { useEffect, useMemo } from "react";
import plugin from "tailwindcss/plugin";
import { IframeInitialContent } from "~/core/components/canvas/IframeInitialContent";
import {
  getChaiThemeOptions,
  getThemeCustomFontFace,
  getThemeFontsUrls,
} from "~/core/components/canvas/static/chai-theme-helpers";
import { CssThemeVariables } from "~/core/components/css-theme-var";
import { ChaiFrame, useFrame } from "~/core/frame";
import { useDarkMode } from "~/hooks/use-dark-mode";
import { useTheme, useThemeOptions } from "~/hooks/use-theme";
import { useRegisteredFonts } from "~/runtime";
import { ChaiFontBySrc, ChaiFontByUrl, ChaiTheme } from "~/types";

const PreviewHeadTags = () => {
  const [chaiTheme] = useTheme();
  const chaiThemeOptions = useThemeOptions();
  const [darkMode] = useDarkMode();
  const { document: iframeDoc, window: iframeWin } = useFrame();
  const registeredFonts = useRegisteredFonts();

  useEffect(() => {
    if (darkMode) iframeDoc?.documentElement.classList.add("dark");
    else iframeDoc?.documentElement.classList.remove("dark");
  }, [darkMode, iframeDoc]);

  useEffect(() => {
    // @ts-ignore
    if (!iframeWin || !iframeWin.tailwind) return;
    // @ts-ignore
    iframeWin.tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          container: {
            center: true,
            padding: "1rem",
            screens: {
              "2xl": "1400px",
            },
          },
          ...getChaiThemeOptions(chaiThemeOptions),
        },
      },
      plugins: [
        typography,
        forms,
        aspectRatio,
        containerQueries,
        plugin(function ({ addBase, theme }: any) {
          addBase({
            "h1,h2,h3,h4,h5,h6": {
              fontFamily: theme("fontFamily.heading"),
            },
            body: {
              fontFamily: theme("fontFamily.body"),
              color: theme("colors.foreground"),
              backgroundColor: theme("colors.background"),
            },
          });
        }),
      ],
    };
  }, [chaiTheme, chaiThemeOptions, iframeWin]);

  const pickedFonts = useMemo(() => {
    const heading = get(chaiTheme, "fontFamily.heading");
    const body = get(chaiTheme, "fontFamily.body");
    return registeredFonts.filter((font) => font.family === heading || font.family === body);
  }, [chaiTheme, registeredFonts]);

  const fontUrls = useMemo(
    () => getThemeFontsUrls(filter(pickedFonts, (font) => has(font, "url")) as ChaiFontByUrl[]),
    [pickedFonts],
  );
  const customFontFaces = useMemo(
    () => getThemeCustomFontFace(filter(pickedFonts, (font) => has(font, "src")) as ChaiFontBySrc[]),
    [pickedFonts],
  );

  return (
    <>
      <CssThemeVariables theme={chaiTheme as ChaiTheme} />
      {fontUrls.map((url, index) => (
        <link key={`preview-font-${index}`} rel="stylesheet" href={url} />
      ))}
      <style id="chai-custom-fonts" dangerouslySetInnerHTML={{ __html: customFontFaces }} />
    </>
  );
};

interface TailwindPreviewIframeProps {
  content: string;
  classes?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const TailwindPreviewIframe = ({
  content,
  classes = "",
  className = "w-full rounded border-0",
  style = { minHeight: 80 },
  title = "Preview",
}: TailwindPreviewIframeProps) => {
  const initialContent = useMemo(() => {
    return IframeInitialContent.replace('dir="__HTML_DIR__"', 'dir="ltr"');
  }, []);

  return (
    // @ts-ignore
    <ChaiFrame className={className} style={style} title={title} initialContent={initialContent}>
      <PreviewHeadTags />
      <div className="h-full p-4">
        <div className={classes || undefined} dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </ChaiFrame>
  );
};
