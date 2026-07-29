import { useDebouncedCallback } from "@react-hookz/web";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  hasStructureErrorsAtom,
  hasStructureWarningsAtom,
  structureErrorsAtom,
  structureValidationValidAtom,
} from "~/atoms/blocks";
import { convertToBlocksTree } from "~/core/functions/blocks-fn";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { ChaiBlock } from "~/types/common";
import { StructureError, StructureRule, defaultRuleRegistry } from "./structure-rules";

export interface UseCheckStructureOptions {
  enableAccessibilityRules?: boolean;
  customRules?: StructureRule[];
}

export const useCheckStructure = (options: UseCheckStructureOptions = {}) => {
  const validateStructure = useBuilderProp("flags.validateStructure", true);
  // Atoms to update
  const setStructureErrors = useSetAtom(structureErrorsAtom);
  const setStructureValidationValid = useSetAtom(structureValidationValidAtom);
  const setHasStructureErrors = useSetAtom(hasStructureErrorsAtom);
  const setHasStructureWarnings = useSetAtom(hasStructureWarningsAtom);

  const validateImmediately = useCallback(
    (passedBlocks?: ChaiBlock[]) => {
      const finalBlocks = passedBlocks;
      if (!validateStructure || !finalBlocks || finalBlocks.length === 0) return;
      const tree = convertToBlocksTree(finalBlocks);
      const allErrors: StructureError[] = [];

      // Get rules to apply
      let rulesToApply = defaultRuleRegistry.getRules();

      // Enable accessibility rules if requested
      if (options.enableAccessibilityRules) {
        defaultRuleRegistry.enableAccessibilityRules();
        rulesToApply = defaultRuleRegistry.getRules();
      }

      // Add custom rules if provided
      if (options.customRules && options.customRules.length > 0) {
        rulesToApply.push(...options.customRules);
      }

      // Run all structure validation rules
      rulesToApply.forEach((rule) => {
        try {
          const ruleErrors = rule.validate(finalBlocks, tree);
          allErrors.push(...ruleErrors);
        } catch (error) {
          console.error(`Error running structure rule "${rule.name}":`, error);
        }
      });

      const hasErrors = allErrors.filter((e) => e.severity === "error").length > 0;
      const hasWarnings = allErrors.filter((e) => e.severity === "warning").length > 0;
      const isStructureValid = !hasErrors;

      // Update atoms
      setStructureErrors(allErrors);
      setStructureValidationValid(isStructureValid);
      setHasStructureErrors(hasErrors);
      setHasStructureWarnings(hasWarnings);
    },
    [
      validateStructure,
      options,
      setStructureErrors,
      setStructureValidationValid,
      setHasStructureErrors,
      setHasStructureWarnings,
    ],
  );

  const runValidation = useDebouncedCallback(
    validateImmediately,
    [
      validateStructure,
      options,
      setStructureErrors,
      setStructureValidationValid,
      setHasStructureErrors,
      setHasStructureWarnings,
    ],
    1000,
  );

  return runValidation;
};

// Export the rule registry for external use
export { defaultRuleRegistry } from "./structure-rules";
export type { StructureError, StructureRule } from "./structure-rules";
