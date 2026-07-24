import { and, eq, inArray, ne } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { getClientIdForBooking } from "@/features/bookings/data";
import { getCreditTypeForGroupType } from "@/features/credits/data";
import { issueCredits } from "@/features/credits/issue";
import { emitDomainNotification } from "@/features/notifications/emit";
import { athlete, booking, classSession, client, groupType } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";
import { db } from "@/lib/db";

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export class SessionAlreadyCancelledError extends Error {
  constructor() {
    super("Session is already cancelled");
    this.name = "SessionAlreadyCancelledError";
  }
}

export interface CancelSessionInput {
  organizationId: string;
  sessionId: string;
  timeZone: string;
  actor: AuditActor;
  now?: Date;
}

export interface CancelSessionResult {
  cancelledBookingIds: string[];
  creditsIssued: number;
}

interface BookingNotificationData {
  bookingId: string;
  athleteName: string;
  groupTypeName: string;
  clientEmail: string;
  clientId: string;
  sessionDate: Date;
}

async function loadBookingsNotificationData(
  organizationId: string,
  bookingIds: string[],
): Promise<BookingNotificationData[]> {
  if (bookingIds.length === 0) return [];
  return db
    .select({
      bookingId: booking.id,
      athleteName: athlete.name,
      groupTypeName: groupType.name,
      clientEmail: client.email,
      clientId: client.id,
      sessionDate: classSession.startTime,
    })
    .from(booking)
    .innerJoin(athlete, and(eq(athlete.id, booking.athleteId), eq(athlete.organizationId, organizationId)))
    .innerJoin(client, and(eq(client.id, athlete.parentClientId), eq(client.organizationId, organizationId)))
    .innerJoin(classSession, and(eq(classSession.id, booking.sessionId), eq(classSession.organizationId, organizationId)))
    .innerJoin(groupType, and(eq(groupType.id, classSession.groupTypeId), eq(groupType.organizationId, organizationId)))
    .where(and(inArray(booking.id, bookingIds), eq(booking.organizationId, organizationId)));
}

export async function cancelClassSession(
  tx: TenantDb,
  input: CancelSessionInput,
): Promise<CancelSessionResult> {
  const now = input.now ?? new Date();

  const [sessionRow] = await tx
    .select({ id: classSession.id, groupTypeId: classSession.groupTypeId, startTime: classSession.startTime })
    .from(classSession)
    .where(
      and(eq(classSession.id, input.sessionId), eq(classSession.organizationId, input.organizationId)),
    )
    .limit(1)
    .for("update");

  if (!sessionRow) throw new SessionNotFoundError();

  const activeBookings = await tx
    .select({ id: booking.id, athleteId: booking.athleteId, paymentStatus: booking.paymentStatus })
    .from(booking)
    .where(
      and(
        eq(booking.sessionId, input.sessionId),
        eq(booking.organizationId, input.organizationId),
        ne(booking.paymentStatus, "cancelled"),
      ),
    )
    .for("update");

  const confirmedIds: string[] = [];
  const allIds: string[] = [];
  let creditsIssued = 0;

  const creditType = await getCreditTypeForGroupType(tx, input.organizationId, sessionRow.groupTypeId);

  for (const bk of activeBookings) {
    allIds.push(bk.id);

    if (bk.paymentStatus === "confirmed" && creditType) {
      const clientId = await getClientIdForBooking(tx, input.organizationId, bk.id);
      if (clientId) {
        await issueCredits(tx, {
          organizationId: input.organizationId,
          clientId,
          creditTypeId: creditType.id,
          athleteId: bk.athleteId,
          quantity: 1,
          source: "admin_session_cancellation",
          sourceBookingId: bk.id,
          timeZone: input.timeZone,
          issuedAt: now,
        });
        creditsIssued++;
        confirmedIds.push(bk.id);
      }
    }
  }

  if (allIds.length > 0) {
    await tx
      .update(booking)
      .set({ paymentStatus: "cancelled", updatedAt: now })
      .where(inArray(booking.id, allIds));
  }

  await tx
    .update(classSession)
    .set({ status: "cancelled" })
    .where(and(eq(classSession.id, input.sessionId), eq(classSession.organizationId, input.organizationId)));

  await recordAudit(tx, {
    action: "class_session.cancel",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "class_session",
    targetId: input.sessionId,
    targetLabel: input.sessionId,
    metadata: {
      affectedBookingCount: allIds.length,
      creditsIssued,
    },
  });

  // Notifications — via db outside the tx for data, enqueued inside for atomicity.
  if (allIds.length > 0) {
    const notifications = await loadBookingsNotificationData(input.organizationId, allIds);
    for (const n of notifications) {
      const dateStr = n.sessionDate.toLocaleDateString("pl", { timeZone: input.timeZone, dateStyle: "medium" });
      const timeStr = n.sessionDate.toLocaleTimeString("pl", { timeZone: input.timeZone, timeStyle: "short" });
      await emitDomainNotification(tx, {
        eventType: "session-cancelled",
        organizationId: input.organizationId,
        accountId: null,
        recipients: [{
          kind: "client",
          clientId: n.clientId,
          email: n.clientEmail,
          locale: "pl",
        }],
        params: {
          athleteName: n.athleteName,
          groupTypeName: n.groupTypeName,
          sessionDate: dateStr,
          sessionTime: timeStr,
        },
        dedupeBasis: `session-cancel:${input.sessionId}:${n.bookingId}`,
      });
    }
  }

  return {
    cancelledBookingIds: allIds,
    creditsIssued,
  };
}
