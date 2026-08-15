import { MousePointerSquareDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TokenInputRow, TokenSliderRow } from "./component-token-editor";

export const ButtonsEditor = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MousePointerSquareDashed className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Buttons")}</span>
      </div>
      <TokenSliderRow tokenKey="--cmp-btn-radius" labelKey="Button radius" min={0} max={24} />
      <TokenInputRow tokenKey="--cmp-btn-padding" labelKey="Button padding" />
      <TokenSliderRow tokenKey="--cmp-btn-font-size" labelKey="Button font size" min={12} max={24} />
      <TokenSliderRow tokenKey="--cmp-btn-height" labelKey="Button height" min={32} max={64} />
    </div>
  );
};

export default ButtonsEditor;
