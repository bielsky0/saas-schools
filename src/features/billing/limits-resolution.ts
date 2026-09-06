/**
 * Pure limit-resolution logic (apex-dashboard-plan Faza 5, §5.1).
 *
 * Kept free of any `@/lib/db` import on purpose (mirrors `admin/flags-resolution.ts`):
 * unit tests exercise the business rule directly and the module stays loadable
 * without the server env. `billing/limits.ts` wraps these in database reads.
 *
 * PRIORITY: org override → group override → plan → fail-closed (0).
 * A `null` value means UNLIMITED (explicit), distinct from 0 (blocked).
 *
 * GROUP PRECEDENCE: among the org's group overrides the HIGHEST value wins
 * ("most generous", the numeric analog of flags' true-wins). An explicit
 * unlimited in any group trumps every number.
 */
export function resolveGroupLimitValue(
  values: (number | null)[] | null | undefined,
): number | null {
  if (!values || values.length === 0) return null;
  // Any explicit unlimited wins outright — nothing is more generous.
  if (values.includes(null)) return null;
  return Math.max(...(values as number[]));
}

/**
 * Pure resolution of the numeric inheritance chain.
 *
 * - orgOverride set (non-null number or explicit unlimited) → it wins.
 * - else a group override that resolves to non-null → wins.
 * - else the plan value.
 * - otherwise fail-closed 0.
 *
 * `groupOverrides` is the raw per-group limit values; `null` entries mean an
 * explicit unlimited, an EMPTY array means the org has no group overrides.
 * Use `undefined` to distinguish "no data supplied" from a real empty set —
 * both fall through to plan, but the type stays honest.
 */
export function resolveEffectiveLimit(input: {
  /** `undefined` = no org override row (inherit). Otherwise the row's value;
   *  `null` value = explicit unlimited. */
  orgOverride: { value: number | null } | undefined;
  /** Raw per-group limit values; empty/undefined = this org has no group limit. */
  groupValues: (number | null)[] | undefined;
  planValue: number | null | undefined;
}): number | null {
  const { orgOverride, groupValues, planValue } = input;

  // `orgOverride === undefined` means "no override row" (inherit). `undefined`
  // was chosen over `null` because the row itself carries a nullable value —
  // NULL there means explicit UNLIMITED — so removing the row is the only way
  // to say "inherits". The DAL passes `undefined` when the query found nothing.
  if (orgOverride !== undefined) {
    return orgOverride.value; // may be null = unlimited
  }

  // A NON-EMPTY `groupValues` means the org carries group overrides. The group
  // resolution may itself be null = explicit unlimited — which we must return
  // as-is (unlimited), NOT fall through. Only an empty set means inherit.
  if (groupValues && groupValues.length > 0) {
    return resolveGroupLimitValue(groupValues);
  }

  // No explicit override anywhere → plan value. `undefined` = no plan def row
  // (or no plan) → fail-closed 0 (blocked); `null` = explicit unlimited.
  return planValue === undefined ? 0 : planValue;
}
