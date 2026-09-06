import { describe, expect, it } from "vitest";

import {
  conditionSatisfied,
  mergeGroupCells,
  resolveEffectiveFlag,
  resolveGroupValue,
} from "./flags-resolution";

/**
 * Feature-flag inheritance engine — pure resolution logic (apex-dashboard-plan
 * §0.10 / §0.13). The DAL is deliberately not exercised here: reads go through
 * withSystemBypass and live agent-side RLS coverage + the RLS integration test.
 * These functions ARE the business rule, so they get the sharpest coverage:
 * org beats group beats global, no-row means inherit, fail-closed.
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

describe("mergeGroupCells", () => {
  const groups = [
    { id: "g1", name: "Academy A" },
    { id: "g2", name: "Academy B" },
    { id: "g3", name: "Academy C" },
  ];

  it("renders EVERY group as a column, one cell per group", () => {
    const cells = mergeGroupCells(groups, []);
    expect(cells).toHaveLength(3);
    expect(cells.map((c) => c.groupId)).toEqual(["g1", "g2", "g3"]);
    expect(cells.map((c) => c.groupName)).toEqual(["Academy A", "Academy B", "Academy C"]);
  });

  it("no override row means inherit (null), not off", () => {
    const cells = mergeGroupCells(groups, []);
    expect(cells.every((c) => c.enabled === null)).toBe(true);
  });

  it("overrides land on the matching group, preserving column order", () => {
    const cells = mergeGroupCells(groups, [
      { scopeId: "g2", enabled: true },
      { scopeId: "g1", enabled: false },
    ]);
    expect(cells.map((c) => c.enabled)).toEqual([false, true, null]);
  });

  it("tolerates null/undefined overrides", () => {
    expect(mergeGroupCells(groups, null)).toHaveLength(3);
    expect(mergeGroupCells(groups, undefined)).toHaveLength(3);
  });

  it("ignores overrides for groups that no longer exist", () => {
    const cells = mergeGroupCells(groups, [{ scopeId: "ghost", enabled: true }]);
    expect(cells.every((c) => c.enabled === null)).toBe(true);
  });
});