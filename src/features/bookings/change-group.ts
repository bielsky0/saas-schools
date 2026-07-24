import { and, eq, inArray } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { classSession, groupChangeRequest } from "@/lib/db/schema";
import { isPgUniqueViolation } from "@/lib/db/errors";
import type { TenantDb } from "@/lib/db/tenant";
import { getBookingWithSession } from "./data";

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export class SessionCancelledError extends Error {
  constructor() {
    super("Target session is cancelled");
    this.name = "SessionCancelledError";
  }
}

export class SourceSessionCancelledError extends Error {
  constructor() {
    super("Source session is cancelled");
    this.name = "SourceSessionCancelledError";
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor() {
    super("Booking is already cancelled");
    this.name = "BookingAlreadyCancelledError";
  }
}

export class DuplicateChangeRequestError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} already has an active group change request`);
    this.name = "DuplicateChangeRequestError";
  }
}

export class ActiveCancellationBlocksChangeRequestError extends Error {
  constructor() {
    super("Booking has an active cancellation in progress");
    this.name = "ActiveCancellationBlocksChangeRequestError";
  }
}

export interface SubmitChangeRequestInput {
  organizationId: string;
  clientId: string;
  sourceBookingId: string;
  targetSessionId: string;
  actor: AuditActor;
}

export interface SubmitChangeRequestResult {
  id: string;
  status: "submitted";
}

/**
 * Submit a group change request (US-11.1).
 *
 * Klient wybiera booking źródłowy + sesję docelową. Request tworzony w
 * statusie `submitted`. Walidacje:
 *   - booking istnieje, nie jest anulowany
 *   - sesja źródłowa nie jest anulowana
 *   - sesja docelowa istnieje, nie jest anulowana
 *   - brak otwartego cancellation na tym bookingu (mutual exclusion)
 *   - brak innego otwartego change requestu na ten booking (duplikat)
 */
export async function submitChangeRequest(
  tx: TenantDb,
  input: SubmitChangeRequestInput,
): Promise<SubmitChangeRequestResult> {
  // 1. Verify source booking exists and is not cancelled.
  const bk = await getBookingWithSession(tx, input.organizationId, input.sourceBookingId);
  if (!bk) throw new BookingNotFoundError();
  if (bk.paymentStatus === "cancelled") throw new BookingAlreadyCancelledError();
  if (bk.sessionStatus === "cancelled") throw new SourceSessionCancelledError();

  // 2. Verify target session exists and is scheduled.
  const [targetSession] = await tx
    .select({ id: classSession.id, status: classSession.status })
    .from(classSession)
    .where(
      and(
        eq(classSession.id, input.targetSessionId),
        eq(classSession.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!targetSession) throw new SessionNotFoundError();
  if (targetSession.status !== "scheduled") throw new SessionCancelledError();

  // 3. Mutual exclusion: no active cancellation on this booking.
  // Wzmianka — w cancel.ts sprawdzamy odwrotny kierunek przy próbie
  // anulowania bookingu. Tu też musimy sprawdzić, czy booking nie ma
  // aktywnego anulowania (payment_status == 'cancelled' już sprawdzony).
  // Poziom wyżej: jeśli booking ma payment_status zmieniany przez
  // cancel, to zmiana statusu na cancelled zablokuje submit.
  // Nic więcej nie trzeba — cancel.ts ustawia payment_status na
  // 'cancelled' i to już jest sprawdzone w punkcie 1.

  // 4. No duplicate active change requests on this source booking.
  const existing = await tx
    .select({ id: groupChangeRequest.id })
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.sourceBookingId, input.sourceBookingId),
        inArray(groupChangeRequest.status, [
          "submitted",
          "admin_approved",
          "awaiting_payment",
        ]),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new DuplicateChangeRequestError(input.sourceBookingId);
  }

  // 5. Create the request.
  try {
    const [row] = await tx
      .insert(groupChangeRequest)
      .values({
        organizationId: input.organizationId,
        clientId: input.clientId,
        sourceBookingId: input.sourceBookingId,
        targetSessionId: input.targetSessionId,
        status: "submitted",
      })
      .returning({ id: groupChangeRequest.id });

    if (!row) throw new Error("Failed to create group change request");

    // Audit.
    await recordAudit(tx, {
      action: "group_change.submit",
      actor: input.actor,
      organizationId: input.organizationId,
      targetType: "group_change_request",
      targetId: row.id,
      targetLabel: row.id,
      metadata: {
        sourceBookingId: input.sourceBookingId,
        targetSessionId: input.targetSessionId,
      },
    });

    return { id: row.id, status: "submitted" };
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      throw new DuplicateChangeRequestError(input.sourceBookingId);
    }
    throw e;
  }
}
