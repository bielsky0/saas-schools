import { and, eq, inArray, lt } from "drizzle-orm";

import type { JobHandler } from "@/lib/adapters/jobs";
import { recordAudit, SYSTEM_ACTOR } from "@/features/admin/audit";
import { booking, groupChangeRequest } from "@/lib/db/schema";
import { withSystemBypass } from "@/lib/db/system";

export const groupChangesExpireHandler: JobHandler<"group_changes.expire"> = async () => {
  const now = new Date();

  await withSystemBypass(
    "group_changes.expire — no user session, system job",
    async (tx) => {
      const expired = await tx
        .select({
          id: groupChangeRequest.id,
          resultingBookingId: groupChangeRequest.resultingBookingId,
          organizationId: groupChangeRequest.organizationId,
        })
        .from(groupChangeRequest)
        .where(
          and(
            eq(groupChangeRequest.status, "awaiting_payment"),
            lt(groupChangeRequest.expiresAt, now),
          ),
        )
        .for("update");

      if (expired.length === 0) return;

      const bookingIds = expired
        .map((r) => r.resultingBookingId)
        .filter((id): id is string => !!id);

      if (bookingIds.length > 0) {
        await tx
          .update(booking)
          .set({ paymentStatus: "cancelled", updatedAt: now })
          .where(inArray(booking.id, bookingIds));
      }

      await tx
        .update(groupChangeRequest)
        .set({ status: "expired", updatedAt: now })
        .where(
          inArray(
            groupChangeRequest.id,
            expired.map((r) => r.id),
          ),
        );

      for (const gcr of expired) {
        await recordAudit(tx, {
          action: "group_change.expire",
          actor: SYSTEM_ACTOR,
          organizationId: gcr.organizationId,
          targetType: "group_change_request",
          targetId: gcr.id,
          targetLabel: gcr.id,
          metadata: {
            resultingBookingCancelled: !!gcr.resultingBookingId,
          },
        });
      }
    },
  );
};
