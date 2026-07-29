import { atomWithStorage } from "jotai/utils";
import { ChaiDesignTokens } from "~/types/types";

export const lsBlocksAtom = atomWithStorage("chai-builder-blocks", []);
export const lsDesignTokensAtom = atomWithStorage<ChaiDesignTokens>("chai-builder-design-tokens", {});
export const lsAiContextAtom = atomWithStorage("chai-builder-ai-context", "");
