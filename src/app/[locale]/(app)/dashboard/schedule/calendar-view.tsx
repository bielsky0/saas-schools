import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Server-rendered month calendar for the schedule (Faza 07, §7b).
 *
 * Deliberately NO client state, following the location filter's rule on this
 * page: month and selected day live in the query string, so a bookmarked
 * calendar is a URL an admin can send, and the calendar keeps working with
 * JavaScript disabled. Navigation is links; the month grid is pure markup.
 *
 * Fill coloring per session: green = seats left, yellow = almost full,
 * red = full. Days the trainer is on leave get a gray background; sessions
 * without a trainer get a red badge in the day list.
 */

export interface CalendarSessionRow {
  id: string;
  startTime: Date;
  capacity: number;
  status: string;
  trainerId: string | null;
  groupTypeName: string;
  trainerName: string | null;
  trainerEmail: string | null;
  locationName: string | null;
  bookedCount: number;
}

export interface CalendarLeaveRow {
  trainerId: string;
  trainerName: string | null;
  startDate: string;
  endDate: string;
}

interface CalendarViewProps {
  year: number;
  month: number; // 1-12
  orgTimezone: string;
  sessions: CalendarSessionRow[];
  leaves: CalendarLeaveRow[];
  selectedDay: string | null; // YYYY-MM-DD
}

const WEEKDAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;

export async function CalendarView({
  year,
  month,
  orgTimezone,
  sessions,
  leaves,
  selectedDay,
}: CalendarViewProps) {
  const [t, locale] = await Promise.all([getTranslations("schedule.calendar"), getLocale()]);

  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: orgTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const sessionsByDay = new Map<string, CalendarSessionRow[]>();
  for (const s of sessions) {
    const key = dayKey(s.startTime);
    const list = sessionsByDay.get(key) ?? [];
    list.push(s);
    sessionsByDay.set(key, list);
  }

  const leavesByDay = new Map<string, string[]>();
  for (const l of leaves) {
    const start = new Date(`${l.startDate}T00:00:00`);
    const end = new Date(`${l.endDate}T23:59:59`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d);
      const names = leavesByDay.get(key) ?? [];
      names.push(l.trainerName ?? "");
      leavesByDay.set(key, names);
    }
  }

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();
  const startWeekday = firstDay.getUTCDay(); // 0=Sun

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const formatWhen = new Intl.DateTimeFormat(locale, {
    timeZone: orgTimezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  const selectedSessions = selectedDay ? (sessionsByDay.get(selectedDay) ?? []) : [];
  const selectedLeaves = selectedDay ? (leavesByDay.get(selectedDay) ?? []) : [];

  const dayCells = [];
  // Grid starts on Monday: (sun) offset 6, else offset (weekday - 1).
  const leadingBlanks = (startWeekday + 6) % 7;
  for (let i = 0; i < leadingBlanks; i++) dayCells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    dayCells.push({ day, key: dayKey(date) });
  }

  const monthLabel = new Intl.DateTimeFormat(locale, {
    timeZone: orgTimezone,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/schedule?view=calendar&month=${prevMonth}`}
            className="border-border hover:bg-muted inline-flex size-8 items-center justify-center rounded-md border"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`/dashboard/schedule?view=calendar&month=${nextMonth}`}
            className="border-border hover:bg-muted inline-flex size-8 items-center justify-center rounded-md border"
            aria-label={t("nextMonth")}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs font-medium">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {t(`weekday.${w}`)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dayCells.map((cell, i) => {
            if (!cell) {
              return <div key={`blank-${i}`} className="min-h-20 border-border border-b border-r" />;
            }
            const daySessions = sessionsByDay.get(cell.key) ?? [];
            const dayLeaves = leavesByDay.get(cell.key) ?? [];
            const isSelected = selectedDay === cell.key;
            return (
              <Link
                key={cell.key}
                href={`/dashboard/schedule?view=calendar&month=${year}-${String(month).padStart(2, "0")}&day=${cell.key}`}
                className={cn(
                  "hover:bg-muted/50 flex min-h-20 flex-col gap-1 border-border border-b border-r p-1.5 transition-colors",
                  dayLeaves.length > 0 && "bg-muted/40",
                  isSelected && "ring-ring ring-2 ring-inset",
                )}
              >
                <span className="text-xs font-medium">{cell.day}</span>
                <div className="flex flex-wrap gap-1">
                  {daySessions.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      title={s.groupTypeName}
                      className={cn(
                        "size-2 rounded-full",
                        s.bookedCount >= s.capacity
                          ? "bg-destructive"
                          : s.bookedCount / Math.max(s.capacity, 1) >= 0.8
                            ? "bg-warning"
                            : "bg-success",
                      )}
                    />
                  ))}
                  {daySessions.length > 3 ? (
                    <span className="text-muted-foreground text-[10px]">
                      +{daySessions.length - 3}
                    </span>
                  ) : null}
                </div>
                {dayLeaves.length > 0 ? (
                  <span className="text-muted-foreground truncate text-[10px]" title={t("leaveTitle", { trainers: dayLeaves.join(", ") })}>
                    {t("onLeave")}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">
            {t("daySessions", {
              date: new Intl.DateTimeFormat(locale, {
                timeZone: orgTimezone,
                dateStyle: "full",
              }).format(new Date(`${selectedDay}T00:00:00`)),
            })}
          </h3>
          {selectedLeaves.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("leaveTitle", { trainers: selectedLeaves.join(", ") })}
            </p>
          ) : null}
          {selectedSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noSessions")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedSessions.map((s) => (
                <li
                  key={s.id}
                  className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {formatWhen.format(new Date(s.startTime))} — {s.groupTypeName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {s.locationName ?? t("noLocation")} · {s.bookedCount}/{s.capacity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {s.trainerName || s.trainerEmail || t("noTrainer")}
                    </span>
                    {!s.trainerId ? (
                      <Badge variant="destructive">{t("noTrainerBadge")}</Badge>
                    ) : null}
                    <Link
                      href={`/dashboard/sessions/${s.id}`}
                      className="text-primary text-xs font-medium"
                    >
                      {t("roster")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
