import { describe, expect, it } from "vitest";

import { zonedWallClockToUtc } from "@/lib/datetime";
import { computeAvailabilitySlots } from "./availability-slots";
import type { AvailabilityWindowInput, ExistingSessionInput } from "./availability-slots";

const WARSAW = "Europe/Warsaw";
const DAY_START = "08:00";
const DAY_END = "20:00";
const DURATION = 60;

function window(dayOfWeek: number, start: string, end: string): AvailabilityWindowInput {
  return { dayOfWeek, startTime: start, endTime: end };
}

function session(year: number, month: number, day: number, hour: number, minute: number, durationMin = 60): ExistingSessionInput {
  const start = zonedWallClockToUtc(year, month, day, hour, minute, WARSAW);
  return { startTime: start, endTime: new Date(start.getTime() + durationMin * 60_000) };
}

function local(year: number, month: number, day: number): Date {
  return zonedWallClockToUtc(year, month, day, 0, 0, WARSAW);
}

describe("computeAvailabilitySlots", () => {
  it("returns slots from availability windows minus existing sessions", () => {
    // Monday window 10:00-12:00, one session at 11:00 → one remaining 60-min slot at 10:00
    const result = computeAvailabilitySlots({
      windows: [window(0, "10:00", "12:00")],
      existingSessions: [session(2026, 8, 3, 11, 0)],
      defaultDurationMinutes: DURATION,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ dayKey: "2026-08-03", startsAt: "10:00", endsAt: "11:00" });
  });

  it("uses fallback 08:00-20:00 when no availability window exists for that day", () => {
    // A Monday with no window at all → 12 slots (08:00-20:00 ÷ 60 min)
    const result = computeAvailabilitySlots({
      windows: [],
      existingSessions: [],
      defaultDurationMinutes: DURATION,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({ dayKey: "2026-08-03", startsAt: "08:00", endsAt: "09:00" });
    expect(result[11]).toMatchObject({ dayKey: "2026-08-03", startsAt: "19:00", endsAt: "20:00" });
  });

  it("slices by defaultDurationMinutes", () => {
    // 30-min slices in a 1-hour window → 2 slots
    const result = computeAvailabilitySlots({
      windows: [window(0, "10:00", "11:00")],
      existingSessions: [],
      defaultDurationMinutes: 30,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ startsAt: "10:00", endsAt: "10:30" });
    expect(result[1]).toMatchObject({ startsAt: "10:30", endsAt: "11:00" });
  });

  it("subtracts a session that falls at the start of an availability window", () => {
    // Window 09:00-11:00, session 09:00-10:00 → one slot at 10:00
    const result = computeAvailabilitySlots({
      windows: [window(0, "09:00", "11:00")],
      existingSessions: [session(2026, 8, 3, 9, 0)],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ startsAt: "10:00", endsAt: "11:00" });
  });

  it("handles multiple days in the range", () => {
    // Monday and Tuesday windows, two days in range → slots on both days
    const result = computeAvailabilitySlots({
      windows: [window(0, "10:00", "11:00"), window(1, "14:00", "15:00")],
      existingSessions: [],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3), // Monday
      dateTo: local(2026, 8, 5),   // Wednesday
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ dayKey: "2026-08-03", startsAt: "10:00" });
    expect(result[1]).toMatchObject({ dayKey: "2026-08-04", startsAt: "14:00" });
  });

  it("returns empty array when all available time is consumed by sessions", () => {
    // One-hour window completely filled by a 60-min session
    const result = computeAvailabilitySlots({
      windows: [window(0, "10:00", "11:00")],
      existingSessions: [session(2026, 8, 3, 10, 0)],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(0);
  });

  it("ignores window for a different day of week", () => {
    // Tuesday window, querying Monday → fallback hours
    const result = computeAvailabilitySlots({
      windows: [window(1, "10:00", "11:00")], // Tuesday
      existingSessions: [],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3), // Monday
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    // Fallback 08:00-20:00 = 12 slots
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({ dayKey: "2026-08-03", startsAt: "08:00" });
  });

  it("unions overlapping windows for the same day", () => {
    // Two overlapping windows: 09:00-11:00 and 10:00-12:00 → union = 09:00-12:00 = 3 slots
    const result = computeAvailabilitySlots({
      windows: [window(0, "09:00", "11:00"), window(0, "10:00", "12:00")],
      existingSessions: [],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ startsAt: "09:00" });
    expect(result[1]).toMatchObject({ startsAt: "10:00" });
    expect(result[2]).toMatchObject({ startsAt: "11:00" });
  });

  it("subtracts a mid-window session and fits 30-min slots on both sides", () => {
    // Window 09:00-11:00, session 09:30-10:00.
    // After subtraction: 09:00-09:30, 10:00-11:00.
    // 30-min slices: 09:00-09:30, 10:00-10:30, 10:30-11:00.
    const result = computeAvailabilitySlots({
      windows: [window(0, "09:00", "11:00")],
      existingSessions: [session(2026, 8, 3, 9, 30, 30)],
      defaultDurationMinutes: 30,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ startsAt: "09:00", endsAt: "09:30" });
    expect(result[1]).toMatchObject({ startsAt: "10:00", endsAt: "10:30" });
    expect(result[2]).toMatchObject({ startsAt: "10:30", endsAt: "11:00" });
  });

  it("handles an edge-of-slice session", () => {
    // Window 09:00-11:00, session exactly 10:00-11:00 → only 09:00-10:00 remains
    const result = computeAvailabilitySlots({
      windows: [window(0, "09:00", "11:00")],
      existingSessions: [session(2026, 8, 3, 10, 0)],
      defaultDurationMinutes: 60,
      dateFrom: local(2026, 8, 3),
      dateTo: local(2026, 8, 4),
      timeZone: WARSAW,
      dayStart: DAY_START,
      dayEnd: DAY_END,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ startsAt: "09:00", endsAt: "10:00" });
  });
});
