import { Eta } from "eta/core";
import { get, isArray, startsWith } from "lodash-es";

const BINDING_REGEX = /\{\{(.*?)\}\}/g;
const SIMPLE_PATH_REGEX = /^[\w$][\w$.]*$/;

const eta = new Eta({
  tags: ["{{", "}}"],
  autoEscape: true,
  autoTrim: false,
  useWith: true,
  parse: { interpolate: "", exec: "~", raw: "~" },
  functionHeader:
    'const safeGet = (obj, path) => { const parts = path.split("."); let val = obj; for (const p of parts) { if (val == null) return undefined; val = val[p]; } return val; };',
});

export const hasBindings = (value: string): boolean => {
  BINDING_REGEX.lastIndex = 0;
  return BINDING_REGEX.test(value);
};

export const isSimplePath = (binding: string): boolean => SIMPLE_PATH_REGEX.test(binding);

export const resolveBindingPath = (binding: string, index: number, repeaterKey: string): string => {
  const repeaterKeyTrimmed = repeaterKey.slice(2, -2).trim();
  if (index !== -1 && startsWith(binding, "$index.")) {
    return `${repeaterKeyTrimmed}.${index}.${binding.slice(7)}`;
  }
  if (index !== -1 && startsWith(binding, "$index")) {
    return `${repeaterKeyTrimmed}.${index}`;
  }
  return binding;
};

export const resolveExpressionIndex = (expression: string, index: number, repeaterKey: string): string => {
  if (index === -1 || !repeaterKey) return expression;
  const repeaterKeyTrimmed = repeaterKey.slice(2, -2).trim();
  return expression
    .replace(/\$index\./g, `safeGet(it, "${repeaterKeyTrimmed}.${index}").`)
    .replace(/\$index/g, `safeGet(it, "${repeaterKeyTrimmed}.${index}")`);
};

export const toEtaTemplate = (template: string, index: number, repeaterKey: string): string => {
  return template.replace(BINDING_REGEX, (_, rawPath) => {
    const trimmed = rawPath.trim();
    if (!trimmed) return `{{""}}`;
    if (SIMPLE_PATH_REGEX.test(trimmed)) {
      const resolved = resolveBindingPath(trimmed, index, repeaterKey);
      return `{{safeGet(it, "${resolved}") ?? ""}}`;
    }
    const resolvedExpr = resolveExpressionIndex(trimmed, index, repeaterKey);
    return `{{${resolvedExpr}}}`;
  });
};

export const renderBinding = (
  template: string,
  data: Record<string, any>,
  index: number,
  repeaterKey: string,
): string => {
  try {
    return eta.renderString(toEtaTemplate(template, index, repeaterKey), data);
  } catch {
    return "";
  }
};

export const resolveStringBinding = (
  value: string,
  data: Record<string, any>,
  index: number,
  repeaterKey: string,
  propertyKey?: string,
): any => {
  BINDING_REGEX.lastIndex = 0;
  const matches = value.match(BINDING_REGEX);
  if (!matches) return value;

  const isImageProperty = propertyKey === "image" || propertyKey === "mobileImage";

  // Check if any simple-path binding resolves to an array or image value
  for (const match of matches) {
    const trimmed = match.slice(2, -2).trim();
    if (!SIMPLE_PATH_REGEX.test(trimmed)) continue;
    const binding = resolveBindingPath(trimmed, index, repeaterKey);
    const bindingValue = get(data, binding);
    if (isArray(bindingValue)) return bindingValue;
    // For image properties, return the raw binding value directly
    if (isImageProperty && bindingValue !== undefined) return bindingValue;
  }

  return renderBinding(value, data, index, repeaterKey);
};

export const resolveBinding = (value: string, data: Record<string, any>): any => {
  return resolveStringBinding(value, data, -1, "");
};
