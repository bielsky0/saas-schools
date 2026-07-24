import { and, eq, inArray } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { issueCredits } from "@/features/credits/issue";
import { emitDomainNotification } from "@/features/notifications/emit";
import { athlete, booking, classSession, client, groupChangeRequest, groupType } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";
import { getBookingWithSession, getClientIdForBooking } from "./data";
import { getCreditTypeForGroupType } from "@/features/credits/data";
import { db } from "@/lib/db";

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor() {
    super("Booking is already cancelled");
    this.name = "BookingAlreadyCancelledError";
  }
}

export class CancellationTooLateError extends Error {
  constructor() {
    super("Cancellation is less than 24 hours before the session starts");
    this.name = "CancellationTooLateError";
  }
}

export class CancellationBlockedByChangeRequestError extends Error {
  constructor() {
    super("Booking has an active group change request");
    this.name = "CancellationBlockedByChangeRequestError";
  }
}

export interface CancelBookingInput {
  organizationId: string;
  bookingId: string;
  timeZone: string;
  actor: AuditActor;
  bypass24h?: boolean;
  now?: Date;
}

export interface CancelBookingResult {
  sessionId: string;
  athleteId: string;
  creditIssued: boolean;
  creditId?: string;
}

interface NotificationData {
  athleteName: string;
  groupTypeName: string;
  clientEmail: string;
  clientId: string;
  sessionDate: Date;
}

async function loadNotificationData(
  organizationId: string,
  bookingId: string,
): Promise<NotificationData | null> {
  const [row] = await db
    .select({
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
    .where(and(eq(booking.id, bookingId), eq(booking.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

function formatSessionDate(date: Date, timeZone: string): { sessionDate: string; sessionTime: string } {
  const dateStr = date.toLocaleDateString("pl", { timeZone, dateStyle: "medium" });
  const timeStr = date.toLocaleTimeString("pl", { timeZone, timeStyle: "short" });
  return { sessionDate: dateStr, sessionTime: timeStr };
}

export async function cancelBooking(
  tx: TenantDb,
  input: CancelBookingInput,
): Promise<CancelBookingResult> {
  const now = input.now ?? new Date();

  const row = await getBookingWithSession(tx, input.organizationId, input.bookingId, {
    lockSession: true,
  });
  if (!row) throw new BookingNotFoundError();
  if (row.paymentStatus === "cancelled") throw new BookingAlreadyCancelledError();

  const [bookingRow] = await tx
    .select({ id: booking.id, paymentStatus: booking.paymentStatus })
    .from(booking)
    .where(
      and(eq(booking.id, input.bookingId), eq(booking.organizationId, input.organizationId)),
    )
    .limit(1)
    .for("update");
  if (!bookingRow) throw new BookingNotFoundError();

  // Mutual exclusion with group change request (Faza 15, US-11.8).
  const [activeRequest] = await tx
    .select({ id: groupChangeRequest.id })
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.sourceBookingId, input.bookingId),
        inArray(groupChangeRequest.status, ["submitted", "admin_approved", "awaiting_payment"]),
      ),
    )
    .limit(1);

  if (activeRequest) {
    throw new CancellationBlockedByChangeRequestError();
  }

  if (!input.bypass24h) {
    const hoursUntil = (row.sessionStartTime.getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil < 24) {
      throw new CancellationTooLateError();
    }
  }

  let creditIssued = false;
  let creditId: string | undefined;

  if (row.paymentStatus === "confirmed") {
    const creditType = await getCreditTypeForGroupType(tx, input.organizationId, row.groupTypeId);
    if (creditType) {
      const clientId = await getClientIdForBooking(tx, input.organizationId, input.bookingId);
      if (clientId) {
        const issued = await issueCredits(tx, {
          organizationId: input.organizationId,
          clientId,
          creditTypeId: creditType.id,
          athleteId: row.athleteId,
          quantity: 1,
          source: "cancellation",
          sourceBookingId: input.bookingId,
          timeZone: input.timeZone,
          issuedAt: now,
        });
        creditIssued = true;
        creditId = issued[0]?.id;
      }
    }
  }

  await tx
    .update(booking)
    .set({ paymentStatus: "cancelled", updatedAt: now })
    .where(eq(booking.id, input.bookingId));

  const action = input.bypass24h ? "booking.cancel_admin" : "booking.cancel";
  await recordAudit(tx, {
    action,
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "booking",
    targetId: input.bookingId,
    targetLabel: input.bookingId,
    metadata: {
      athleteId: row.athleteId,
      sessionId: row.sessionId,
      previousPaymentStatus: row.paymentStatus,
      credited: creditIssued,
      creditId: creditId ?? null,
    },
  });

  // Notification — enqueued INSIDE the transaction (outbox), but data loaded
  // via `db` to keep FOR UPDATE windows minimal.
  const notifData = await loadNotificationData(input.organizationId, input.bookingId);
  if (notifData) {
    const { sessionDate, sessionTime } = formatSessionDate(notifData.sessionDate, input.timeZone);
    await emitDomainNotification(tx, {
      eventType: "booking-cancelled",
      organizationId: input.organizationId,
      accountId: null,
      recipients: [{
        kind: "client",
        clientId: notifData.clientId,
        email: notifData.clientEmail,
        locale: "pl",
      }],
      params: {
        athleteName: notifData.athleteName,
        groupTypeName: notifData.groupTypeName,
        sessionDate,
        sessionTime,
      },
      dedupeBasis: `booking-cancel:${input.bookingId}`,
    });
  }

  return {
    sessionId: row.sessionId,
    athleteId: row.athleteId,
    creditIssued,
    creditId,
  };
}
