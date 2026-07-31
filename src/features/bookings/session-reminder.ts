import { and, eq, gte, lt, ne } from "drizzle-orm";

import type { JobHandler } from "@/lib/adapters/jobs";
import { emitDomainNotification } from "@/features/notifications/emit";
import { athlete, booking, classSession, client, groupType, organization } from "@/lib/db/schema";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { formatSessionDate } from "./session-reminder.format";

const log = createLogger("bookings");

/**
 * Session reminder sweep (langlion Faza 6, EPIK 44).
 *
 * Every scheduled session starting within the next `REMIND_WINDOW_MS` gets one
 * `session-reminder` to each parent with a non-cancelled booking on it. A daily
 * cron means a session's single reminder lands anywhere in the window before it
 * — the tradeoff of a sweep over per-session scheduled jobs, and why the window
 * starts at `now` rather than "a day ahead": a window that opens later would
 * silently skip sessions that are already inside it.
 *
 * Idempotent by construction, as §12.2 requires of a re-claimable job: the emit
 * carries the `session-reminder:{bookingId}` dedupe key, so a second delivery of
 * the same row collapses in the outbox and the sweep reports zero.
 *
 * ⚠️ NARROW BYPASS, the same shape as `credits/expire.ts`: sessions start on
 * their own clocks in every academy at once, so the work list cannot name a
 * tenant. The bypass covers only that read; each emit below re-enters the tenant
 * context of the rows' OWN organization.
 */
const REMIND_WINDOW_MS = 24 * 60 * 60 * 1000;

export const sessionReminderHandler: JobHandler<"bookings.remind_session"> = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MS);

  const rows = await withSystemBypass(
    "session reminder sweep — sessions start in every academy at once",
    (tx) =>
      tx
        .select({
          bookingId: booking.id,
          organizationId: booking.organizationId,
          orgName: organization.name,
          timezone: organization.timezone,
          sessionStartTime: booking.sessionStartTime,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          athleteName: athlete.name,
          groupTypeName: groupType.name,
        })
        .from(booking)
        .innerJoin(
          organization,
          eq(organization.id, booking.organizationId),
        )
        .innerJoin(
          athlete,
          and(eq(athlete.id, booking.athleteId), eq(athlete.organizationId, booking.organizationId)),
        )
        .innerJoin(
          client,
          and(
            eq(client.id, athlete.parentClientId),
            eq(client.organizationId, booking.organizationId),
          ),
        )
        .innerJoin(
          classSession,
          and(
            eq(classSession.id, booking.sessionId),
            eq(classSession.organizationId, booking.organizationId),
          ),
        )
        .innerJoin(
          groupType,
          and(
            eq(groupType.id, classSession.groupTypeId),
            eq(groupType.organizationId, booking.organizationId),
          ),
        )
        .where(
          and(
            eq(classSession.status, "scheduled"),
            ne(booking.paymentStatus, "cancelled"),
            gte(booking.sessionStartTime, now),
            lt(booking.sessionStartTime, windowEnd),
          ),
        )
        .orderBy(booking.sessionStartTime),
  );

  if (rows.length === 0) {
    log.info("session reminder sweep: nothing due");
    return;
  }

  // Group by tenant so each academy's notifications enqueue inside one tenant
  // transaction rather than one transaction per booking.
  const byOrganization = new Map<string, typeof rows>();
  for (const row of rows) {
    const orgRows = byOrganization.get(row.organizationId) ?? [];
    orgRows.push(row);
    byOrganization.set(row.organizationId, orgRows);
  }

  let reminded = 0;
  for (const [organizationId, orgRows] of byOrganization) {
    await withTenant(organizationId, async (tx) => {
      for (const row of orgRows) {
        const { sessionDate, sessionTime } = formatSessionDate(row.sessionStartTime, row.timezone);
        await emitDomainNotification(tx, {
          eventType: "session-reminder",
          organizationId,
          accountId: null,
          recipients: [
            {
              kind: "client",
              clientId: row.clientId,
              email: row.clientEmail,
              name: row.clientName ?? undefined,
              locale: "pl",
            },
          ],
          params: {
            orgName: row.orgName,
            athleteName: row.athleteName,
            groupTypeName: row.groupTypeName,
            sessionDate,
            sessionTime,
          },
          dedupeBasis: `session-reminder:${row.bookingId}`,
        });
        reminded += 1;
      }
    });
  }

  log.info("session reminder sweep", {
    reminded,
    scanned: rows.length,
    organizations: byOrganization.size,
  });
};
