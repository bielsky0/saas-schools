import { mergeClasses } from "~/core/main";
import React, { ChangeEvent, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface ChaiSelectProps {
  defaultValue?: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  height?: string;
}

const ChaiSelect: React.FC<ChaiSelectProps> = ({
  defaultValue = "",
  onValueChange,
  options,
  placeholder = "Select",
  className = "",
  height = "",
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedValue(value);
    onValueChange(value);
  };

  return (
    <div className={mergeClasses("relative inline-block w-full", className)}>
      <select
        className={mergeClasses(
          "mt-1 flex w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          height,
        )}
        value={selectedValue}
        onChange={handleChange}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChaiSelect;
