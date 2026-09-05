import { describe, expect, it } from "vitest";

import { conditionSatisfied, resolveEffectiveFlag, resolveGroupValue } from "./flags-resolution";

/**
 * Feature-flag inheritance engine — pure resolution logic (apex-dashboard-plan
 * §0.10 / §0.13). The DAL is deliberately not exercised here: reads go through
 * withSystemBypass and live agent-side RLS coverage + the RLS integration test.
 * These three functions ARE the business rule, so they get the sharpest
 * coverage: org beats group beats global, no-row means inherit, fail-closed.
 */

describe("resolveGroupValue", () => {
  it("returns null when the org has no group overrides", () => {
    expect(resolveGroupValue([])).toBeNull();
    expect(resolveGroupValue(null)).toBeNull();
    expect(resolveGroupValue(undefined)).toBeNull();
  });

  it("enabled=true in any group wins ('enabled=true wygrywa')", () => {
    expect(resolveGroupValue([{ enabled: false }, { enabled: true }])).toBe(true);
    expect(resolveGroupValue([{ enabled: true }, { enabled: false }])).toBe(true);
  });

  it("no true group override resolves to false, not null", () => {
    expect(resolveGroupValue([{ enabled: false }])).toBe(false);
    expect(resolveGroupValue([{ enabled: false }, { enabled: false }])).toBe(false);
  });
});

describe("resolveEffectiveFlag", () => {
  it("org override beats group override beats global", () => {
    expect(
      resolveEffectiveFlag({ orgOverride: false, groupOverride: true, enabledGlobal: true }),
    ).toBe(false);
    expect(
      resolveEffectiveFlag({ orgOverride: null, groupOverride: true, enabledGlobal: false }),
    ).toBe(true);
    expect(
      resolveEffectiveFlag({ orgOverride: null, groupOverride: null, enabledGlobal: true }),
    ).toBe(true);
  });

  it("inherits through null overrides instead of defaulting off", () => {
    expect(
      resolveEffectiveFlag({ orgOverride: null, groupOverride: null, enabledGlobal: true }),
    ).toBe(true);
    expect(
      resolveEffectiveFlag({ orgOverride: false, groupOverride: null, enabledGlobal: true }),
    ).toBe(false);
  });

  it("fail-closed: nothing set ⇒ false", () => {
    expect(
      resolveEffectiveFlag({ orgOverride: null, groupOverride: null, enabledGlobal: false }),
    ).toBe(false);
  });
});

describe("conditionSatisfied", () => {
  it("true without a condition", () => {
    expect(conditionSatisfied(0)).toBe(true);
    expect(conditionSatisfied(999, undefined)).toBe(true);
    expect(conditionSatisfied(999, null)).toBe(true);
  });

  it("gates on a metric threshold", () => {
    const condition = { metric: "members", gte: 1000 };
    expect(conditionSatisfied(1000, condition)).toBe(true);
    expect(conditionSatisfied(1001, condition)).toBe(true);
    expect(conditionSatisfied(999, condition)).toBe(false);
  });
});