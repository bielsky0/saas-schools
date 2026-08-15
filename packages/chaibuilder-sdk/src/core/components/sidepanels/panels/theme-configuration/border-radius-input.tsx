import { useDebouncedCallback } from "@react-hookz/web";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";

type BorderRadiusInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Faza 3 (§4.4): suwak + ręczny input numeryczny, zmiany debounced 200 ms
 * (ujednolicone z edytorami tokenów — bez zapisu per-klatkę).
 */
const BorderRadiusInput = ({ value, onChange, disabled }: BorderRadiusInputProps) => {
  const { t } = useTranslation();
  const [_value, _setValue] = useState(value);
  const debouncedChange = useDebouncedCallback(onChange, [value], 200);

  const commit = (raw: string) => {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      _setValue(`${num}px`);
      debouncedChange(`${num}px`);
    }
  };

  const parsed = parseFloat(_value);
  const numericValue = Number.isFinite(parsed) ? parsed : 0;

  return (
    <div className="flex items-center gap-2">
      <Slider
        min={0}
        step={1}
        max={50}
        disabled={disabled}
        value={[numericValue]}
        onValueChange={(next) => commit(next[0].toString())}
        className="flex-1 cursor-pointer"
      />
      <Input
        type="number"
        min={0}
        max={50}
        step={1}
        disabled={disabled}
        value={numericValue}
        onChange={(event) => commit(event.target.value)}
        className="h-7 w-16 text-right text-xs"
        aria-label={t("Border Radius")}
      />
    </div>
  );
};

export default BorderRadiusInput;
