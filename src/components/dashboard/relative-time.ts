import { getLocale } from "next-intl/server";

/** Relative time for server components ("5 min temu" / "5 min ago"). */
export async function formatRelativeTime(date: Date): Promise<string> {
  const locale = await getLocale();
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);

  const units: Array<{ max: number; unit: Intl.RelativeTimeFormatUnit; div: number }> = [
    { max: 60_000, unit: "second", div: 1_000 },
    { max: 3_600_000, unit: "minute", div: 60_000 },
    { max: 86_400_000, unit: "hour", div: 3_600_000 },
    { max: 2_592_000_000, unit: "day", div: 86_400_000 },
    { max: 31_536_000_000, unit: "month", div: 2_592_000_000 },
  ];

  const hit = units.find((u) => abs < u.max);
  if (hit) {
    const value = Math.round(diffMs / hit.div);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, hit.unit);
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
