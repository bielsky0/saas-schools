import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { componentTokensAtom } from "~/atoms/builder";
import { componentTokensToCssVars } from "~/render";

/**
 * Wstrzykuje tokeny komponentowe (`--cmp-*`) jako CSS vars wewnątrz iframe canvasu,
 * aby edytory tokenów (Faza 3 §4.2) miały natychmiastowy live preview.
 */
export const ComponentTokensCssVariables = () => {
  const tokens = useAtomValue(componentTokensAtom);
  const css = useMemo(() => componentTokensToCssVars(tokens), [tokens]);
  if (!css) return null;
  return <style id="chai-component-tokens" dangerouslySetInnerHTML={{ __html: css }} />;
};
