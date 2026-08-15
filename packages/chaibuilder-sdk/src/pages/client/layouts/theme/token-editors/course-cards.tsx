import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TokenInputRow, TokenSliderRow } from "./component-token-editor";

export const CourseCardsEditor = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Course cards")}</span>
      </div>
      <TokenSliderRow tokenKey="--cmp-card-radius" labelKey="Card radius" min={0} max={32} />
      <TokenInputRow tokenKey="--cmp-card-padding" labelKey="Card padding" />
    </div>
  );
};

export default CourseCardsEditor;
