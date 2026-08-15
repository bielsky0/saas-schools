import { FormInput } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TokenInputRow, TokenSliderRow } from "./component-token-editor";

export const FormFieldsEditor = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FormInput className="h-3 w-3 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">{t("Form fields")}</span>
      </div>
      <TokenSliderRow tokenKey="--cmp-field-radius" labelKey="Field radius" min={0} max={24} />
      <TokenInputRow tokenKey="--cmp-field-padding" labelKey="Field padding" />
      <TokenSliderRow tokenKey="--cmp-field-font-size" labelKey="Field font size" min={12} max={24} />
      <TokenSliderRow tokenKey="--cmp-field-height" labelKey="Field height" min={32} max={64} />
    </div>
  );
};

export default FormFieldsEditor;
