import { zonedDayKey, zonedPartsOf, zonedWallClockToUtc } from "@/lib/datetime";

export interface AvailabilityWindowInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ExistingSessionInput {
  startTime: Date;
  endTime: Date;
}

export interface ComputedSlot {
  dayKey: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

function localDayOfWeek(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

interface MinuteRange {
  start: number;
  end: number;
}

function toMinutes(time: string): number {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function formatTime(minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function unionRanges(ranges: MinuteRange[]): MinuteRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const first = sorted[0];
  if (!first) return [];
  const merged: MinuteRange[] = [{ start: first.start, end: first.end }];
  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item) continue;
    const last = merged[merged.length - 1];
    if (last && item.start <= last.end) {
      last.end = Math.max(last.end, item.end);
    } else {
      merged.push({ start: item.start, end: item.end });
    }
  }
  return merged;
}

function subtractRanges(available: MinuteRange[], sessions: MinuteRange[]): MinuteRange[] {
  if (sessions.length === 0) return available;
  const sortedSessions = [...sessions].sort((a, b) => a.start - b.start);
  const result: MinuteRange[] = [];
  for (const avail of available) {
    let gapStart = avail.start;
    for (const ses of sortedSessions) {
      if (ses.end <= gapStart) continue;
      if (ses.start >= avail.end) break;
      if (ses.start > gapStart) {
        result.push({ start: gapStart, end: Math.min(ses.start, avail.end) });
      }
      gapStart = Math.max(gapStart, ses.end);
    }
    if (gapStart < avail.end) {
      result.push({ start: gapStart, end: avail.end });
    }
  }
  return result;
}

function sliceGap(gapStart: number, gapEnd: number, sliceMinutes: number): MinuteRange[] {
  const slots: MinuteRange[] = [];
  let cursor = gapStart;
  while (cursor + sliceMinutes <= gapEnd) {
    slots.push({ start: cursor, end: cursor + sliceMinutes });
    cursor += sliceMinutes;
  }
  return slots;
}

export function computeAvailabilitySlots(params: {
  windows: AvailabilityWindowInput[];
  existingSessions: ExistingSessionInput[];
  defaultDurationMinutes: number;
  dateFrom: Date;
  dateTo: Date;
  timeZone: string;
  dayStart?: string;
  dayEnd?: string;
}): ComputedSlot[] {
  const { windows, existingSessions, defaultDurationMinutes, dateFrom, dateTo, timeZone } = params;
  const dayStart = params.dayStart ?? "08:00";
  const dayEnd = params.dayEnd ?? "20:00";

  const windowMinutesByDay = new Map<number, number[]>();
  for (const win of windows) {
    const existing = windowMinutesByDay.get(win.dayOfWeek) ?? [];
    existing.push(toMinutes(win.startTime), toMinutes(win.endTime));
    windowMinutesByDay.set(win.dayOfWeek, existing);
  }

  const windowByDay = new Map<number, MinuteRange[]>();
  for (const [dow, mins] of windowMinutesByDay) {
    const ranges: MinuteRange[] = [];
    for (let i = 0; i < mins.length; i += 2) {
      const s = mins[i];
      const e = mins[i + 1];
      if (s !== undefined && e !== undefined) {
        ranges.push({ start: s, end: e });
      }
    }
    windowByDay.set(dow, unionRanges(ranges));
  }

  const sessionsByDay = new Map<string, MinuteRange[]>();
  for (const ses of existingSessions) {
    const dayKey = zonedDayKey(ses.startTime, timeZone);
    const localStart = zonedPartsOf(ses.startTime, timeZone);
    const localEnd = zonedPartsOf(ses.endTime, timeZone);
    const existing = sessionsByDay.get(dayKey) ?? [];
    existing.push({
      start: localStart.hour * 60 + localStart.minute,
      end: localEnd.hour * 60 + localEnd.minute,
    });
    sessionsByDay.set(dayKey, existing);
  }

  const slots: ComputedSlot[] = [];
  let cursor = new Date(dateFrom.getTime());

  while (cursor < dateTo) {
    const dayKey = zonedDayKey(cursor, timeZone);
    const local = zonedPartsOf(cursor, timeZone);
    const dayOfWeek = localDayOfWeek(local.year, local.month, local.day);

    const rawWindows = windowByDay.get(dayOfWeek);
    let available: MinuteRange[];
    if (rawWindows && rawWindows.length > 0) {
      available = rawWindows;
    } else {
      available = [{ start: toMinutes(dayStart), end: toMinutes(dayEnd) }];
    }

    const daySessions = sessionsByDay.get(dayKey);
    const subtracted = daySessions ? subtractRanges(available, daySessions) : available;

    for (const range of subtracted) {
      const sliced = sliceGap(range.start, range.end, defaultDurationMinutes);
      for (const s of sliced) {
        slots.push({
          dayKey,
          startsAt: formatTime(s.start),
          endsAt: formatTime(s.end),
          durationMinutes: defaultDurationMinutes,
        });
      }
    }

    cursor = zonedWallClockToUtc(local.year, local.month, local.day + 1, 0, 0, timeZone);
  }

  return slots;
}
