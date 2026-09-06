import { describe, expect, it } from "vitest";

import { resolveEffectiveLimit, resolveGroupLimitValue } from "./limits-resolution";

/**
 * Numeric limit inheritance (apex-dashboard-plan Faza 5 §5.1). Pure resolution
 * logic only — the DAL reads go through withSystemBypass and RLS coverage lives
 * in the integration/R e2e layer. Priority: org override → group override →
 * plan → fail-closed (0). NULL = unlimited (explicit), distinct from 0.
 */

describe("resolveGroupLimitValue", () => {
  it("returns null when the org has no group overrides", () => {
    expect(resolveGroupLimitValue([])).toBeNull();
    expect(resolveGroupLimitValue(null)).toBeNull();
    expect(resolveGroupLimitValue(undefined)).toBeNull();
  });

  it("highest value wins among the org's groups (most generous)", () => {
    expect(resolveGroupLimitValue([5, 10, 3])).toBe(10);
    expect(resolveGroupLimitValue([10, 5])).toBe(10);
    expect(resolveGroupLimitValue([0, 10])).toBe(10);
  });

  it("an explicit unlimited (null) in any group trumps every number", () => {
    expect(resolveGroupLimitValue([5, null, 10])).toBeNull();
  });
});

describe("resolveEffectiveLimit", () => {
  it("org override beats group override beats plan", () => {
    expect(
      resolveEffectiveLimit({ orgOverride: { value: 3 }, groupValues: [10], planValue: 100 }),
    ).toBe(3);
    expect(
      resolveEffectiveLimit({ orgOverride: undefined, groupValues: [10], planValue: 100 }),
    ).toBe(10);
    expect(
      resolveEffectiveLimit({ orgOverride: undefined, groupValues: [], planValue: 100 }),
    ).toBe(100);
  });

  it("org override row with null value means UNLIMITED and beats a numeric group value", () => {
    expect(
      resolveEffectiveLimit({ orgOverride: { value: null }, groupValues: [10], planValue: 5 }),
    ).toBeNull();
  });

  it("explicit unlimited in a group override flows through", () => {
    expect(resolveEffectiveLimit({ orgOverride: undefined, groupValues: [null], planValue: 5 })).toBeNull();
  });

  it("no override anywhere falls back to plan", () => {
    expect(resolveEffectiveLimit({ orgOverride: undefined, groupValues: [], planValue: 50 })).toBe(50);
  });

  it("plan def with null value means unlimited", () => {
    expect(resolveEffectiveLimit({ orgOverride: undefined, groupValues: [], planValue: null })).toBeNull();
  });

  it("fail-closed: no override and no plan def → 0 (blocked)", () => {
    expect(resolveEffectiveLimit({ orgOverride: undefined, groupValues: [], planValue: undefined })).toBe(0);
    expect(resolveEffectiveLimit({ orgOverride: undefined, groupValues: [], planValue: 0 })).toBe(0);
  });
});
