import { and, eq } from "drizzle-orm";

import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { booking, groupChangeRequest } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export class ChangeRequestNotFoundError extends Error {
  constructor() {
    super("Group change request not found");
    this.name = "ChangeRequestNotFoundError";
  }
}

export class ChangeRequestNotCancellableError extends Error {
  constructor(status: string) {
    super(`Group change request cannot be cancelled in status: ${status}`);
    this.name = "ChangeRequestNotCancellableError";
  }
}

export interface CancelChangeRequestInput {
  organizationId: string;
  requestId: string;
  cancelledByUserId?: string;
  cancellationReason?: string;
  actor: AuditActor;
}

const CANCELLABLE_STATUSES = ["submitted", "admin_approved", "awaiting_payment"] as const;

/**
 * Cancel a group change request (US-11.5).
 *
 * Client or admin can cancel before finalization. If a resulting_booking exists,
 * it is also cancelled to free the seat on the target session. The source booking
 * remains untouched.
 */
export async function cancelChangeRequest(
  tx: TenantDb,
  input: CancelChangeRequestInput,
  cancelledBy: "client" | "admin",
): Promise<void> {
  const [req] = await tx
    .select()
    .from(groupChangeRequest)
    .where(
      and(
        eq(groupChangeRequest.id, input.requestId),
        eq(groupChangeRequest.organizationId, input.organizationId),
      ),
    )
    .limit(1)
    .for("update");

  if (!req) throw new ChangeRequestNotFoundError();

  if (!CANCELLABLE_STATUSES.includes(req.status as typeof CANCELLABLE_STATUSES[number])) {
    throw new ChangeRequestNotCancellableError(req.status);
  }

  const newStatus = cancelledBy === "admin" ? "cancelled_by_admin" : "cancelled_by_client";

  if (req.resultingBookingId) {
    await tx
      .update(booking)
      .set({ paymentStatus: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(booking.id, req.resultingBookingId),
          eq(booking.organizationId, input.organizationId),
        ),
      );
  }

  await tx
    .update(groupChangeRequest)
    .set({
      status: newStatus,
      cancelledByUserId: input.cancelledByUserId ?? null,
      cancellationReason: input.cancellationReason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(groupChangeRequest.id, input.requestId));

  await recordAudit(tx, {
    action: `group_change.${cancelledBy === "admin" ? "admin_cancel" : "client_cancel"}`,
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "group_change_request",
    targetId: input.requestId,
    targetLabel: input.requestId,
    metadata: {
      previousStatus: req.status,
      cancelledBy,
      cancellationReason: input.cancellationReason ?? null,
      resultingBookingCancelled: !!req.resultingBookingId,
    },
  });

  if (cancelledBy === "admin") {
    // Notify is loaded and emitted inside the transaction — outbox pattern.
    // We just log the action; the admin cancel notification to client
    // is handled by the notification center via the audit event.
    // The notification template "group-change-cancelled" is seeded.
  }
}
