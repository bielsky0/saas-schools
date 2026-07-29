"use client";

import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { formatParentSlug } from "~/pages/utils/slug-utils";

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  parentSlug?: string;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  fullSlug?: string | undefined;
}

export function SlugInput({
  value,
  onChange,
  placeholder,
  parentSlug,
  onValidationChange,
  disabled = false,
  fullSlug,
}: SlugInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Replace spaces and non-allowed characters with hyphens
    // Only allow letters, numbers, hyphens, underscores, and dots
    const sanitized = input
      .replace(/\//g, "") // Remove slashes
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-_.]/g, "-") // Replace other non-allowed chars with hyphens (allow dots)
      .replace(/-+/g, "-") // Replace multiple consecutive hyphens with a single one
      .replace(/^-+/, "") // Remove leading hyphens
      .toLowerCase();

    // Check if there are multiple dots
    const dotCount = (sanitized.match(/\./g) || []).length;
    const isValid = dotCount <= 1;

    // Set error message if there are multiple dots
    if (dotCount > 1) {
      setError("Invalid slug. Only one dot (.) is allowed in the slug");
    } else {
      setError(null);
    }

    // Notify parent component about validation status if callback is provided
    if (onValidationChange) {
      onValidationChange(isValid);
    }

    setDisplayValue(sanitized);
    onChange(sanitized);
  };

  return (
    <div>
      {parentSlug && (
        <div className="mb-1 flex items-center">
          <span className="text-xs text-gray-500">
            Parent: <span className="font-mono text-gray-900">{formatParentSlug(parentSlug)}</span>
          </span>
        </div>
      )}
      <div className="relative">
        <Input
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={error ? "border-red-500" : ""}
        />
        {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
      </div>
      {fullSlug && fullSlug !== "undefined" && (
        <div className="mt-1 flex items-center">
          <span className="text-xs text-gray-500">
            Complete Slug: <span className="font-mono text-gray-900">{fullSlug}</span>
          </span>
        </div>
      )}
    </div>
  );
}
