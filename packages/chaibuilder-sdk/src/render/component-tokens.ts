import type { ComponentTokens } from "~/types/types";

/**
 * Serializuje tokeny komponentowe (`--cmp-*`) do bloku CSS `:root { ... }`,
 * gotowego do wstrzyknięcia jako `<style>` (edytor i publiczna strona).
 * Faza 3 (§4.2): tokeny są osobnymi CSS vars — poza `ChaiTheme`.
 */
export const componentTokensToCssVars = (tokens: ComponentTokens): string => {
  const declarations = Object.entries(tokens)
    .filter(([, value]) => typeof value === "string" && value.trim() !== "")
    .map(([name, value]) => `  ${name}: ${value};`);
  if (declarations.length === 0) return "";
  return `:root {\n${declarations.join("\n")}\n}`;
};
