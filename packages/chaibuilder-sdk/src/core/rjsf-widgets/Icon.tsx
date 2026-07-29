import { WidgetProps } from "@rjsf/utils";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const IconPicker = lazy(() => import("./IconPicker").then((module) => ({ default: module.IconPicker })));

const sanitizeSvg = (svgString: string): string => {
  try {
    // Remove width and height attributes
    let cleaned = svgString
      .replace(/<svg([^>]*)\sheight="[^"]*"([^>]*)>/gi, "<svg$1$2>")
      .replace(/<svg([^>]*)\swidth="[^"]*"([^>]*)>/gi, "<svg$1$2>");

    // Remove extra whitespace between tags
    cleaned = cleaned.replace(/>\s+</g, "><");

    // Remove newlines and extra spaces
    cleaned = cleaned.replace(/\n/g, "").replace(/\s{2,}/g, " ");

    // Trim spaces around attributes
    cleaned = cleaned.replace(/\s+=/g, "=").replace(/=\s+/g, "=");

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

    return cleaned.trim();
  } catch {
    return svgString;
  }
};

const IconPickerField = ({ value, onChange, id }: WidgetProps) => {
  const { t } = useTranslation();
  const [svgInput, setSvgInput] = useState(value || "");

  useEffect(() => {
    setSvgInput(value || "");
  }, [value]);

  const handleSvgChange = (newSvg: string) => {
    setSvgInput(newSvg);
    const sanitized = sanitizeSvg(newSvg);
    onChange(sanitized);
  };

  return (
    <div className="mt-1 flex flex-col gap-2" id="icon-picker-field">
      <div className="flex items-center gap-x-2">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
          {svgInput ? (
            <div className="h-6 w-6" dangerouslySetInnerHTML={{ __html: svgInput }} />
          ) : (
            <span className="text-xs text-gray-400">SVG</span>
          )}
        </div>
        <textarea
          id={id}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          value={svgInput}
          onChange={(e) => handleSvgChange(e.target.value)}
          placeholder={t("SVG_code")}
          rows={2}
          className="no-scrollbar w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="flex items-center gap-2">
        <Suspense fallback={<div className="text-xs text-muted-foreground">Loading...</div>}>
          <IconPicker onSelectIcon={handleSvgChange} />
        </Suspense>
        <p className="text-xs text-muted-foreground">{t("Paste SVG_code")}</p>
      </div>
    </div>
  );
};

export { IconPickerField };
