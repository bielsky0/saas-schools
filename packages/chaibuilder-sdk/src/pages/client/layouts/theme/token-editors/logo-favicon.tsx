import { ImageIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { Label } from "~/components/ui/label";
import { ImagePicker } from "~/pages/digital-asset-manager";
import { useComponentTokens } from "./component-token-editor";

/**
 * Faza 3 (§4.2): logo i favicon. URL-e zapisywane jako tokeny `--cmp-logo-url` /
 * `--cmp-favicon-url` (persystencja COMPONENT_TOKENS + wstrzyknięcie na stronie
 * publicznej jako CSS vars; bloki mogą je konsumować przez `var(--cmp-logo-url)`).
 */
export const LogoFaviconEditor = () => {
  const { t } = useTranslation();
  const { tokens, setToken } = useComponentTokens();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Logo and favicon")}</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-700">{t("Logo")}</Label>
        <ImagePicker
          assetUrl={tokens["--cmp-logo-url"] || undefined}
          onChange={({ url }) => setToken("--cmp-logo-url", url)}
          placeholder={t("Choose logo image")}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-700">{t("Favicon")}</Label>
        <ImagePicker
          assetUrl={tokens["--cmp-favicon-url"] || undefined}
          onChange={({ url }) => setToken("--cmp-favicon-url", url)}
          placeholder={t("Choose favicon image")}
        />
      </div>
    </div>
  );
};

export default LogoFaviconEditor;
