import { filter, get } from "lodash-es";
import { ChaiBlock } from "~/types/common";

/**
 * Helper to extract partial IDs from blocks
 */
export const extractPartialIds = (blocks: ChaiBlock[]): string[] => {
  return filter(
    blocks.map((b) =>
      b._type === "PartialBlock" || b._type === "GlobalBlock"
        ? get(b, "partialBlockId", get(b, "globalBlock", ""))
        : null,
    ),
    Boolean,
  ) as string[];
};

/**
 * Checks if adding targetPartialId to currentPartialId would create a circular dependency.
 * @param currentPartialId - The partial currently being edited
 * @param targetPartialId - The partial being added
 * @param dependencies - Map of partialId to array of partialIds it contains
 * @param visited - Set of already visited partials (for cycle detection)
 * @returns true if adding would create a cycle
 */
export function wouldCreateCycle(
  currentPartialId: string,
  targetPartialId: string,
  dependencies: Record<string, string[]>,
  visited = new Set<string>(),
): boolean {
  // Self-reference
  if (currentPartialId === targetPartialId) return true;

  // Already visited (cycle in graph)
  if (visited.has(targetPartialId)) return false;
  visited.add(targetPartialId);

  // Check if target contains current (directly or transitively)
  const targetDeps = dependencies[targetPartialId] || [];
  for (const dep of targetDeps) {
    if (dep === currentPartialId) return true;
    if (wouldCreateCycle(currentPartialId, dep, dependencies, visited)) return true;
  }

  return false;
}

/**
 * Calculates the maximum nesting depth of a partial.
 * @param partialId - The partial to calculate depth for
 * @param dependencies - Map of partialId to array of partialIds it contains
 * @param visited - Set of already visited partials (for cycle protection)
 * @returns The depth of the partial (1 = no nested partials)
 */
export function getPartialDepth(
  partialId: string,
  dependencies: Record<string, string[]>,
  visited = new Set<string>(),
): number {
  if (visited.has(partialId)) return 0; // Cycle, don't count
  visited.add(partialId);

  const deps = dependencies[partialId] || [];
  if (deps.length === 0) return 1;

  return 1 + Math.max(...deps.map((d) => getPartialDepth(d, dependencies, new Set(visited))));
}
