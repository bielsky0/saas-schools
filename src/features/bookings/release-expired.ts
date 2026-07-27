import { and, eq, inArray, lt, not, sql } from "drizzle-orm";

import type { JobHandler } from "@/lib/adapters/jobs";
import { recordAudit, SYSTEM_ACTOR } from "@/features/admin/audit";
import { booking, groupChangeRequest } from "@/lib/db/schema";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { PENDING_PAYMENT_TTL_MS, toBatchMap } from "./release-expired.constants";

const log = createLogger("bookings");

const BATCH_SIZE = 500;

export const releaseExpiredPendingHandler: JobHandler<"bookings.release_expired_pending"> =
  async () => {
    const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS);

    const due = await withSystemBypass(
      "bookings.release_expired_pending — release seats held by stale payment_pending bookings",
      (tx) =>
        tx
          .select({
            id: booking.id,
            organizationId: booking.organizationId,
            sessionId: booking.sessionId,
          })
          .from(booking)
          .where(
            and(
              eq(booking.paymentStatus, "payment_pending"),
              lt(booking.createdAt, cutoff),
              not(
                sql`EXISTS (
              SELECT 1 FROM ${groupChangeRequest} gcr
              WHERE gcr.resulting_booking_id = ${booking.id}
                AND gcr.status = 'awaiting_payment'
            )`,
              ),
            ),
          )
          .orderBy(booking.createdAt)
          .limit(BATCH_SIZE),
    );

    if (due.length === 0) {
      log.info("release_expired_pending: nothing due");
      return;
    }

    const byOrganization = toBatchMap(due);

    let released = 0;
    for (const [organizationId, ids] of byOrganization) {
      const updated = await withTenant(organizationId, async (tx) => {
        const rows = await tx
          .update(booking)
          .set({ paymentStatus: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(booking.organizationId, organizationId),
              inArray(booking.id, ids),
              eq(booking.paymentStatus, "payment_pending"),
              lt(booking.createdAt, sql`now() - interval '15 minutes'`),
            ),
          )
          .returning({ id: booking.id });

        for (const row of rows) {
          await recordAudit(tx, {
            action: "booking.expire_pending",
            actor: SYSTEM_ACTOR,
            organizationId,
            targetType: "booking",
            targetId: row.id,
            targetLabel: row.id,
            metadata: { releasedBy: "system.cron" },
          });
        }

        return rows.length;
      });

      released += updated;
    }

    log.info("released expired pending bookings", {
      released,
      scanned: due.length,
      organizations: byOrganization.size,
      saturated: due.length === BATCH_SIZE,
    });
  };
