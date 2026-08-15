import { useAtom } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { componentTokensAtom } from "~/atoms/builder";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { useSaveWebsiteData } from "~/hooks/use-save-website-data";

/**
 * Domyślne wartości tokenów komponentowych (`--cmp-*`) — źródło dla resetu i
 * fallbacków edytorów. Musi być spójne z `shopify-tokens.css` (Faza 1).
 */
export const COMPONENT_TOKEN_DEFAULTS: Record<string, string> = {
  "--cmp-btn-radius": "4px",
  "--cmp-btn-padding": "8px 16px",
  "--cmp-btn-font-size": "14px",
  "--cmp-btn-height": "40px",
  "--cmp-field-radius": "4px",
  "--cmp-field-padding": "8px 12px",
  "--cmp-field-font-size": "14px",
  "--cmp-field-height": "40px",
  "--cmp-card-radius": "8px",
  "--cmp-card-padding": "16px",
  "--cmp-heading-size": "28px",
  "--cmp-body-size": "16px",
  "--cmp-section-gap": "32px",
  "--cmp-container-max-width": "1200px",
};

/**
 * Hook współdzielony przez edytory tokenów komponentowych: czyta `componentTokensAtom`,
 * zapisuje przez `debouncedSaveComponentTokens` (persystencja COMPONENT_TOKENS, 4.2a).
 */
export const useComponentTokens = () => {
  const [tokens, setTokens] = useAtom(componentTokensAtom);
  const { debouncedSaveComponentTokens } = useSaveWebsiteData();

  const setToken = useCallback(
    (key: string, value: string) => {
      setTokens((prev) => ({ ...prev, [key]: value }));
      debouncedSaveComponentTokens();
    },
    [setTokens, debouncedSaveComponentTokens],
  );

  const resetToken = useCallback(
    (key: string) => {
      setTokens((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      debouncedSaveComponentTokens();
    },
    [setTokens, debouncedSaveComponentTokens],
  );

  return { tokens, setToken, resetToken };
};

export const getTokenValue = (tokens: Record<string, string>, key: string): string =>
  tokens[key] ?? COMPONENT_TOKEN_DEFAULTS[key] ?? "";

const parseUnitValue = (raw: string) => {
  const parsed = parseFloat(raw);
  const unit = raw.replace(/^-?\d+(\.\d+)?/, "");
  return { value: Number.isFinite(parsed) ? parsed : NaN, unit };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Wiersz edycji dowolnego tokenu (tekstowy input).
 */
export const TokenInputRow = ({ tokenKey, labelKey }: { tokenKey: string; labelKey: string }) => {
  const { t } = useTranslation();
  const { tokens, setToken } = useComponentTokens();
  const value = getTokenValue(tokens, tokenKey);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <Label htmlFor={`${tokenKey}-input`} className="text-xs font-medium text-gray-700">
        {t(labelKey)}
      </Label>
      <Input
        id={`${tokenKey}-input`}
        value={value}
        onChange={(event) => setToken(tokenKey, event.target.value)}
        className="h-7 w-28 text-right text-xs"
        aria-label={t(labelKey)}
      />
    </div>
  );
};

/**
 * Wiersz edycji wartości numerycznej z suwakiem + ręcznym wpisem (debounce po stronie
 * `setToken` — zapis debounced, podgląd aktualizuje się płynnie).
 */
export const TokenSliderRow = ({
  tokenKey,
  labelKey,
  min,
  max,
  step = 1,
}: {
  tokenKey: string;
  labelKey: string;
  min: number;
  max: number;
  step?: number;
}) => {
  const { t } = useTranslation();
  const { tokens, setToken } = useComponentTokens();
  const raw = getTokenValue(tokens, tokenKey);
  const { value: parsed, unit } = parseUnitValue(raw);
  const value = Number.isFinite(parsed) ? clamp(parsed, min, max) : min;
  const unitSuffix = unit || "px";

  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${tokenKey}-slider`} className="text-xs font-medium text-gray-700">
          {t(labelKey)}
        </Label>
        <div className="flex items-center gap-1">
          <Input
            id={`${tokenKey}-slider`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(parsed) ? parsed : ""}
            onChange={(event) => {
              const n = Number(event.target.value);
              if (Number.isFinite(n)) setToken(tokenKey, `${n}${unitSuffix}`);
            }}
            className="h-7 w-16 text-right text-xs"
            aria-label={t(labelKey)}
          />
          <span className="w-5 text-xs text-muted-foreground">{unitSuffix}</span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => setToken(tokenKey, `${next}${unitSuffix}`)}
        className="cursor-pointer"
      />
    </div>
  );
};
