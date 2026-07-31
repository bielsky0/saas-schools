import { describe, expect, it } from "vitest";

import { formatSessionDate } from "./session-reminder.format";

/**
 * Faza 6 — session reminder sweep (EPIK 44).
 *
 * The reminder email must read the session's instant on the academy's OWN clock,
 * so `sessionStartTime` (UTC) is formatted against `organization.timezone` —
 * never the runner's zone. These cases pin that down.
 */
describe("formatSessionDate", () => {
  it("formats an afternoon instant in Europe/Warsaw (CEST, UTC+2)", () => {
    const instant = new Date("2026-08-03T15:30:00.000Z");
    const { sessionDate, sessionTime } = formatSessionDate(instant, "Europe/Warsaw");
    expect(sessionDate).toBe("3 sie 2026");
    expect(sessionTime).toBe("17:30");
  });

  it("rolls the calendar date forward when the zone is ahead of UTC", () => {
    // 23:30 UTC on Aug 3 is already 00:30 on Aug 4 in Warsaw.
    const instant = new Date("2026-08-03T23:30:00.000Z");
    expect(formatSessionDate(instant, "Europe/Warsaw").sessionDate).toBe("4 sie 2026");
  });

  it("keeps a winter-time (CET, UTC+1) reading", () => {
    const instant = new Date("2026-01-15T18:00:00.000Z");
    const { sessionDate, sessionTime } = formatSessionDate(instant, "Europe/Warsaw");
    expect(sessionDate).toBe("15 sty 2026");
    expect(sessionTime).toBe("19:00");
  });

  it("reads a different zone independently of the runner's", () => {
    const instant = new Date("2026-08-03T18:00:00.000Z");
    const warsaw = formatSessionDate(instant, "Europe/Warsaw");
    const newYork = formatSessionDate(instant, "America/New_York");
    expect(warsaw.sessionDate).toBe("3 sie 2026");
    // 18:00 UTC = 14:00 EDT, still the same calendar date.
    expect(newYork.sessionDate).toBe("3 sie 2026");
    expect(newYork.sessionTime).toBe("14:00");
  });

  it("normalizes a UTC+14 zone so the date can jump ahead", () => {
    // 10:00 UTC on Aug 3 is already Aug 4 in Pacific/Kiritimati.
    const instant = new Date("2026-08-03T10:00:00.000Z");
    expect(formatSessionDate(instant, "Pacific/Kiritimati").sessionDate).toBe("4 sie 2026");
  });
});
