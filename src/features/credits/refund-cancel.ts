import { and, asc, eq, gt, inArray } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { booking, classSession, credit, creditPurchase, groupChangeRequest } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

/**
 * Cancel future bookings that consumed credits from a specific purchase,
 * as part of a full-reversal refund (Faza 16, US-18.1/AC3).
 *
 * LOCKING ORDER CONVENTION (deadlock prevention):
 * When locking overlapping rows across booking + groupChangeRequest from
 * different entry points, always ORDER BY booking.id ascending. This makes
 * the row-level lock acquisition order deterministic regardless of which
 * feature initiated the transaction. Same convention applied in
 * cancel-session.ts:98.
 *
 * WHY NOT cancelBooking(): cancelBooking() issues a cancellation credit
 * as compensation. In a refund context that would be double compensation
 * (money + credit) and creates a race window where the new credit could
 * be spent before being refunded. This path cancels the booking and marks
 * the consumed credit as refunded atomically, in the same transaction.
 */
export async function cancelFutureBookingsForRefund(
  tx: TenantDb,
  input: {
    organizationId: string;
    creditPurchaseId: string;
    actor: AuditActor;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();

  // 1. Find consumed credits with future bookings.
  //    ORDER BY booking.id per the locking convention.
  const usedCredits = await tx
    .select({
      creditId: credit.id,
      bookingId: booking.id,
    })
    .from(credit)
    .innerJoin(
      booking,
      and(
        eq(booking.id, credit.usedInBookingId),
        eq(booking.organizationId, input.organizationId),
      ),
    )
    .innerJoin(
      classSession,
      and(
        eq(classSession.id, booking.sessionId),
        eq(classSession.organizationId, input.organizationId),
      ),
    )
    .where(
      and(
        eq(credit.creditPurchaseId, input.creditPurchaseId),
        eq(credit.status, "used"),
        gt(classSession.startTime, now),
      ),
    )
    .orderBy(asc(booking.id))
    .for("update");

  if (usedCredits.length === 0) return;

  const sourceBookingIds = [...new Set(usedCredits.map((c) => c.bookingId))];

  // 2. Cascade: cancel open group_change_requests on these bookings.
  //    Same locking convention — lock in sourceBookingId order (deterministic via ORDER BY).
  const openGcrs = await tx
    .select({ id: groupChangeRequest.id, resultingBookingId: groupChangeRequest.resultingBookingId })
    .from(groupChangeRequest)
    .where(
      and(
        inArray(groupChangeRequest.sourceBookingId, sourceBookingIds),
        inArray(groupChangeRequest.status, ["submitted", "admin_approved", "awaiting_payment"]),
      ),
    )
    .orderBy(asc(groupChangeRequest.id))
    .for("update");

  // 2a. Cancel any resulting bookings held by those requests.
  for (const gcr of openGcrs) {
    if (gcr.resultingBookingId) {
      await tx
        .update(booking)
        .set({ paymentStatus: "cancelled", updatedAt: now })
        .where(eq(booking.id, gcr.resultingBookingId));
    }
  }
  // 2b. Mark the requests as cancelled by admin.
  if (openGcrs.length > 0) {
    await tx
      .update(groupChangeRequest)
      .set({ status: "cancelled_by_admin", cancellationReason: "purchase refunded", updatedAt: now })
      .where(inArray(groupChangeRequest.id, openGcrs.map((r) => r.id)));
  }

  // 3. Atomically transition used → pending_refund → refunded + cancel booking.
  //    All within the same transaction, eliminating the race window.
  for (const row of usedCredits) {
    await tx
      .update(credit)
      .set({ status: "pending_refund" })
      .where(eq(credit.id, row.creditId));
    await tx
      .update(booking)
      .set({ paymentStatus: "cancelled", updatedAt: now })
      .where(eq(booking.id, row.bookingId));
  }

  for (const row of usedCredits) {
    await tx
      .update(credit)
      .set({ status: "refunded" })
      .where(eq(credit.id, row.creditId));
  }

  // 4. Audit.
  for (const row of usedCredits) {
    await recordAudit(tx, {
      action: "booking.cancel_for_refund",
      actor: input.actor,
      organizationId: input.organizationId,
      targetType: "booking",
      targetId: row.bookingId,
      targetLabel: row.bookingId,
      metadata: {
        creditPurchaseId: input.creditPurchaseId,
        creditId: row.creditId,
        reason: "full_reversal_refund",
      },
    });
  }
}
