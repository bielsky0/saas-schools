/**
 * Pure feature-flag resolution logic (apex-dashboard-plan Faza 0, §0.10).
 *
 * Kept free of any `@/lib/db` import on purpose: unit tests (0.13) exercise the
 * business rule directly, and this module must stay loadable without the server
 * env (`@/lib/env/server` validates env at import time). `flags.ts` imports
 * these and wraps them in withSystemBypass database reads.
 */
import type { FeatureFlagCondition } from "@/lib/db/schema/admin-feature-flags";

/**
 * Beam the group override up: `enabled=true` in any of the org's groups wins
 * ("enabled=true wygrywa"); otherwise the most recent group override is the
 * source — but since no group said true, that value is false.
 */
export function resolveGroupValue(
  overrides: { enabled: boolean }[] | null | undefined,
): boolean | null {
  if (!overrides || overrides.length === 0) return null;
  return overrides.some((o) => o.enabled) ? true : false;
}

/**
 * Pure resolution of the inheritance chain. `orgOverride` beats `groupOverride`
 * beats `enabledGlobal`; a NULL override means inherit, not off.
 */
export function resolveEffectiveFlag(input: {
  orgOverride: boolean | null;
  groupOverride: boolean | null;
  enabledGlobal: boolean;
}): boolean {
  return input.orgOverride ?? input.groupOverride ?? input.enabledGlobal ?? false;
}

/** Pure condition check: the flag's gate is met when usage >= gte. */
export function conditionSatisfied(
  usage: number,
  condition?: FeatureFlagCondition | null,
): boolean {
  if (!condition || typeof condition.gte !== "number") return true;
  return usage >= condition.gte;
}

/** One group cell in the /admin/feature-flags matrix. */
export type MatrixGroupCell = {
  groupId: string;
  groupName: string;
  /** false = override off; true = override on; null = inherit (no row). */
  enabled: boolean | null;
};

/**
 * Pure merge of a flag's per-group overrides onto the FULL group list, so the
 * matrix renders one cell per group ("no row" → `enabled: null` = inherit)
 * instead of only the groups that happen to carry an override.
 */
export function mergeGroupCells(
  groups: { id: string; name: string }[],
  overrides: { scopeId: string; enabled: boolean }[] | null | undefined,
): MatrixGroupCell[] {
  const byId = new Map<string, boolean>();
  for (const o of overrides ?? []) byId.set(o.scopeId, o.enabled);
  return groups.map((g) => ({
    groupId: g.id,
    groupName: g.name,
    enabled: byId.get(g.id) ?? null,
  }));
}