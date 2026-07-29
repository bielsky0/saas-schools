import { Eta } from "eta/core";
import { get, isArray, isObject } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "~/components/ui/input";

type UserDataBindingProps = {
  currentExpression: string;
  externalData: Record<string, any>;
  onSave: (expression: string) => void;
};

type SuggestionOption = { path: string; type: string };

type SuggestionMeta = {
  start: number;
  end: number;
  options: SuggestionOption[];
};

const eta = new Eta({
  tags: ["{{", "}}"],
  autoEscape: true,
  autoTrim: false,
  useWith: true,
  parse: { interpolate: "", exec: "~", raw: "~" },
});

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(?:window|document|globalThis|process|Function|eval|import|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/,
  /(^|[^=!<>])=([^=]|$)/,
  /\b(?:while|for|try|catch|class|new)\b/,
];

const getTypeLabel = (value: any): string => {
  if (isArray(value)) return "array";
  if (value === null) return "null";
  if (isObject(value)) return "JSON";
  return typeof value;
};

const getChildKeys = (data: Record<string, any>, parentPath: string): SuggestionOption[] => {
  const parent = parentPath ? get(data, parentPath) : data;
  if (!isObject(parent) || parent === null || isArray(parent)) return [];

  return Object.entries(parent as Record<string, any>)
    .filter(([key]) => !key.startsWith("#"))
    .map(([key, val]) => ({
      path: parentPath ? `${parentPath}.${key}` : key,
      type: getTypeLabel(val),
    }));
};

const validateExpression = (expression: string): string | null => {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const hasMaliciousPattern = FORBIDDEN_PATTERNS.some((pattern) => pattern.test(trimmed));

  if (hasMaliciousPattern) {
    return "Unsafe expression detected";
  }

  try {
    eta.compile(`{{${trimmed}}}`);
    return null;
  } catch {
    return "Invalid expression syntax";
  }
};

export const UserDataBinding = ({ currentExpression, externalData, onSave }: UserDataBindingProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(currentExpression);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestionMeta, setSuggestionMeta] = useState<SuggestionMeta | null>(null);

  useEffect(() => {
    setValue(currentExpression);
    setError(validateExpression(currentExpression));
    setSuggestionMeta(null);
    setActiveIndex(0);
  }, [currentExpression]);

  const topLevelKeys = useMemo(
    () =>
      Object.entries(externalData ?? {})
        .filter(([key]) => !key.startsWith("#"))
        .map(([key, val]) => ({
          key,
          type: getTypeLabel(val),
        })),
    [externalData],
  );

  const updateSuggestions = (nextValue: string, cursorPosition: number) => {
    const beforeCursor = nextValue.slice(0, cursorPosition);
    const tokenMatch = beforeCursor.match(/[A-Za-z_$][\w$.]*\.?$/);

    if (!tokenMatch) {
      setSuggestionMeta(null);
      return;
    }

    const token = tokenMatch[0];
    let options: SuggestionOption[];

    if (token.endsWith(".")) {
      const parentPath = token.slice(0, -1);
      options = getChildKeys(externalData, parentPath);
    } else {
      const dotIndex = token.lastIndexOf(".");
      if (dotIndex === -1) {
        options = getChildKeys(externalData, "").filter((o) => o.path.toLowerCase().startsWith(token.toLowerCase()));
      } else {
        const parentPath = token.slice(0, dotIndex);
        const partial = token.slice(dotIndex + 1).toLowerCase();
        options = getChildKeys(externalData, parentPath).filter((o) => {
          const leaf = o.path.slice(o.path.lastIndexOf(".") + 1);
          return leaf.toLowerCase().startsWith(partial);
        });
      }
    }

    options = options.slice(0, 8);

    if (!options.length) {
      setSuggestionMeta(null);
      setActiveIndex(0);
      return;
    }

    setSuggestionMeta({
      start: cursorPosition - token.length,
      end: cursorPosition,
      options,
    });
    setActiveIndex(0);
  };

  const applySuggestion = (path: string) => {
    if (!suggestionMeta) return;

    const nextValue = value.slice(0, suggestionMeta.start) + path + value.slice(suggestionMeta.end);

    setValue(nextValue);
    setError(validateExpression(nextValue));
    setSuggestionMeta(null);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      const cursorPosition = suggestionMeta.start + path.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  useEffect(() => {
    if (!suggestionMeta || !listRef.current) return;
    const activeEl = listRef.current.children[activeIndex] as HTMLElement;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, suggestionMeta]);

  return (
    <div className="grid gap-2">
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">Data</p>
        <div className="flex flex-wrap gap-1">
          {topLevelKeys.map((entry) => (
            <span key={entry.key} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px]">
              <span className="font-medium">{entry.key}</span>
              <span className="ml-0.5 text-muted-foreground">: {entry.type}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          id="expression"
          value={value}
          className={`h-8 text-xs ${error ? "border-red-500" : ""}`}
          onChange={(event) => {
            const nextValue = event.target.value;
            const cursorPosition = event.target.selectionStart ?? nextValue.length;

            setValue(nextValue);
            setError(validateExpression(nextValue));
            updateSuggestions(nextValue, cursorPosition);
          }}
          onKeyDown={(event) => {
            if (suggestionMeta && suggestionMeta.options.length) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => (prev >= suggestionMeta.options.length - 1 ? 0 : prev + 1));
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => (prev <= 0 ? suggestionMeta.options.length - 1 : prev - 1));
                return;
              }

              if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                const selected = suggestionMeta.options[activeIndex];
                if (selected) {
                  applySuggestion(selected.path);
                }
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setSuggestionMeta(null);
                setActiveIndex(0);
                return;
              }
            }

            if (event.key === "Enter") {
              event.preventDefault();
              const validationError = validateExpression(value);
              setError(validationError);
              if (!validationError) {
                onSave(value.trim());
              }
            }
          }}
          placeholder="name === 'x'"
          autoComplete="off"
        />

        {suggestionMeta && (
          <div
            ref={listRef}
            className="absolute z-20 mt-1 max-h-36 w-full overflow-auto rounded border bg-background p-1 shadow">
            {suggestionMeta.options.map((option, index) => (
              <button
                key={option.path}
                type="button"
                className={`block w-full rounded px-2 py-1 text-left text-[10px] hover:bg-muted ${
                  index === activeIndex ? "bg-muted" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applySuggestion(option.path);
                }}>
                <span className="font-medium">{option.path.slice(option.path.lastIndexOf(".") + 1)}</span>
                <span className="ml-1 text-muted-foreground">: {option.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
};
