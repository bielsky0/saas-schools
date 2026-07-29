import { Slider } from "~/components/ui/slider";
import { useThrottledCallback } from "@react-hookz/web";
import { useState } from "react";

type BorderRadiusInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const BorderRadiusInput = ({ value, onChange, disabled }: BorderRadiusInputProps) => {
  const [_value, _setValue] = useState(value);
  const throttledChange = useThrottledCallback(onChange, [value], 200, true);
  return (
    <Slider
      min={0}
      step={1}
      max={50}
      disabled={disabled}
      value={[Number(_value.replace("px", ""))]}
      onValueChange={(value) => {
        _setValue(value[0].toString() + "px");
        throttledChange(value[0].toString());
      }}
      className="flex-1 cursor-pointer"
    />
  );
};

export default BorderRadiusInput;
