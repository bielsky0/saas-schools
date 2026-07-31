/**
 * Pure date formatting for the session-reminder sweep (Faza 6, EPIK 44).
 *
 * Kept free of server/env imports so it stays unit-testable: the reminder email
 * must read the session's instant on the ACADEMY's own clock, not the runner's
 * (and never the parent's browser), so the sweep resolves `sessionStartTime`
 * against `organization.timezone` before the values enter the template params.
 */
export function formatSessionDate(
  date: Date,
  timeZone: string,
): { sessionDate: string; sessionTime: string } {
  const dateStr = date.toLocaleDateString("pl", { timeZone, dateStyle: "medium" });
  const timeStr = date.toLocaleTimeString("pl", { timeZone, timeStyle: "short" });
  return { sessionDate: dateStr, sessionTime: timeStr };
}
