import { describe, expect, it } from "vitest";

import { computeTrialConversion, DEFAULT_TRIAL_CONVERSION_WINDOW_DAYS } from "./trial-conversion";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const TRIAL_GT = { id: "gt-trial-1", name: "Koszykówka próbna" };
const ANOTHER_TRIAL_GT = { id: "gt-trial-2", name: "Piłka próbna" };

describe("DEFAULT_TRIAL_CONVERSION_WINDOW_DAYS", () => {
  it("is 30 days", () => {
    expect(DEFAULT_TRIAL_CONVERSION_WINDOW_DAYS).toBe(30);
  });
});

describe("computeTrialConversion", () => {
  it("returns empty when no trial group types exist", () => {
    const result = computeTrialConversion([], [], [], [], 30);
    expect(result).toEqual([]);
  });

  it("returns zero rows when no sessions or bookings exist", () => {
    const result = computeTrialConversion([TRIAL_GT], [], [], [], 30);
    expect(result).toEqual([
      { groupTypeId: "gt-trial-1", name: "Koszykówka próbna", trialCount: 0, conversionCount: 0, conversionRate: 0 },
    ]);
  });

  it("counts trial + conversion within window as a conversion", () => {
    const athleteId = "athlete-1";
    const result = computeTrialConversion(
      [TRIAL_GT],
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [{ athleteId, sessionId: "s-1", sessionStartTime: daysAgo(10) }],
      [{ athleteId, sessionStartTime: daysAgo(5) }],
      30,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.trialCount).toBe(1);
    expect(result[0]!.conversionCount).toBe(1);
    expect(result[0]!.conversionRate).toBe(1);
  });

  it("counts only within conversion window — outside 30 days is NOT a conversion", () => {
    const athleteId = "athlete-1";
    const result = computeTrialConversion(
      [TRIAL_GT],
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [{ athleteId, sessionId: "s-1", sessionStartTime: daysAgo(100) }],
      [{ athleteId, sessionStartTime: daysAgo(50) }],
      30,
    );
    expect(result[0]!.trialCount).toBe(1);
    expect(result[0]!.conversionCount).toBe(0);
    expect(result[0]!.conversionRate).toBe(0);
  });

  it("cancelled trial booking is NOT counted as trial", () => {
    const athleteId = "athlete-1";
    const result = computeTrialConversion(
      [TRIAL_GT],
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [],  // No active trial bookings — the cancelled one is excluded upstream
      [],
      30,
    );
    expect(result[0]!.trialCount).toBe(0);
    expect(result[0]!.conversionCount).toBe(0);
    expect(result[0]!.conversionRate).toBe(0);
  });

  it("group_type without isTrialOffer=true does not appear in report", () => {
    // Even if passed explicitly, only the trial group types are returned.
    // The query layer filters upstream; the pure function only receives
    // trial group types as input, so non-trial GTs never appear.
    const nonTrialGt = { id: "gt-regular", name: "Zwykłe zajęcia" };
    const result = computeTrialConversion(
      [TRIAL_GT],  // nonTrialGt is NOT passed here
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [],
      [],
      30,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.groupTypeId).toBe("gt-trial-1");
  });

  it("same athlete with two trial GTs — one converts, one doesn't", () => {
    const athleteId = "athlete-1";
    const result = computeTrialConversion(
      [TRIAL_GT, ANOTHER_TRIAL_GT],
      [
        { id: "s-1", groupTypeId: "gt-trial-1" },
        { id: "s-2", groupTypeId: "gt-trial-2" },
      ],
      [
        { athleteId, sessionId: "s-1", sessionStartTime: daysAgo(10) },
        { athleteId, sessionId: "s-2", sessionStartTime: daysAgo(100) },
      ],
      [{ athleteId, sessionStartTime: daysAgo(5) }],
      30,
    );
    const gt1 = result.find((r) => r.groupTypeId === "gt-trial-1")!;
    const gt2 = result.find((r) => r.groupTypeId === "gt-trial-2")!;
    expect(gt1.trialCount).toBe(1);
    expect(gt1.conversionCount).toBe(1);  // non-trial booking (day5) within 30d of first trial (day10)
    expect(gt2.trialCount).toBe(1);
    expect(gt2.conversionCount).toBe(0);  // non-trial booking (day5) NOT within 30d of day100
  });

  it("two athletes on same trial GT — one converts, other doesn't", () => {
    const result = computeTrialConversion(
      [TRIAL_GT],
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [
        { athleteId: "athlete-1", sessionId: "s-1", sessionStartTime: daysAgo(10) },
        { athleteId: "athlete-2", sessionId: "s-1", sessionStartTime: daysAgo(10) },
      ],
      [{ athleteId: "athlete-1", sessionStartTime: daysAgo(5) }],
      30,
    );
    expect(result[0]!.trialCount).toBe(2);
    expect(result[0]!.conversionCount).toBe(1);
    expect(result[0]!.conversionRate).toBe(0.5);
  });

  it("non-trial booking before trial booking does not count as conversion", () => {
    const athleteId = "athlete-1";
    const result = computeTrialConversion(
      [TRIAL_GT],
      [{ id: "s-1", groupTypeId: "gt-trial-1" }],
      [{ athleteId, sessionId: "s-1", sessionStartTime: daysAgo(5) }],
      [{ athleteId, sessionStartTime: daysAgo(10) }],  // before trial
      30,
    );
    expect(result[0]!.conversionCount).toBe(0);
  });
});
