import { ChaiBlock } from "~/types/common";

/**
 * Unified state for a single partial block entry
 */
export type PartialBlockEntry = {
  blocks: ChaiBlock[];
  dependencies: string[];
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
};

/**
 * Type for the partial blocks list (used in add-blocks panel)
 */
export type PartialBlockList = Record<string, { name?: string; description?: string; type?: string }>;

/**
 * Result type for can-add-partial checks
 */
export type CanAddPartialResult = {
  canAdd: boolean;
  reason?: string;
};
