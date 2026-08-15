import { Ruler } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TokenSliderRow } from "./component-token-editor";

export const SpacingWidthEditor = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Spacing and width")}</span>
      </div>
      <TokenSliderRow tokenKey="--cmp-container-max-width" labelKey="Container width" min={800} max={1600} step={20} />
      <TokenSliderRow tokenKey="--cmp-section-gap" labelKey="Section gap" min={16} max={128} step={4} />
    </div>
  );
};

export default SpacingWidthEditor;
