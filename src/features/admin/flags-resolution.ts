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