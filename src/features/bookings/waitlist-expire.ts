import { and, eq, lt } from "drizzle-orm";

import type { JobHandler } from "@/lib/adapters/jobs";
import { waitlistEntry } from "@/lib/db/schema";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { expireWaitlistOffer, offerNextWaitlisted } from "./waitlist";

const log = createLogger("bookings");

const BATCH_SIZE = 500;

export const waitlistExpireHandler: JobHandler<"waitlist.expire_offers"> = async () => {
  const now = new Date();

  const due = await withSystemBypass(
    "waitlist.expire_offers — expire offers past their TTL",
    (tx) =>
      tx
        .select({
          id: waitlistEntry.id,
          organizationId: waitlistEntry.organizationId,
          sessionId: waitlistEntry.sessionId,
          resultingBookingId: waitlistEntry.resultingBookingId,
        })
        .from(waitlistEntry)
        .where(
          and(
            eq(waitlistEntry.status, "offered"),
            lt(waitlistEntry.offerExpiresAt, now),
          ),
        )
        .orderBy(waitlistEntry.createdAt)
        .limit(BATCH_SIZE),
  );

  if (due.length === 0) {
    log.info("waitlist.expire_offers: nothing due");
    return;
  }

  let expired = 0;
  let offeredNext = 0;

  for (const entry of due) {
    const result = await withTenant(entry.organizationId, async (tx) => {
      const r = await expireWaitlistOffer(tx, {
        organizationId: entry.organizationId,
        entryId: entry.id,
        priceSnapshot: { amount: 0, currency: "PLN" },
        now,
      });
      return r;
    });

    expired++;
    if (result.offeredNext) offeredNext++;
  }

  log.info("waitlist.expire_offers: completed", {
    expired,
    offeredNext,
    scanned: due.length,
    saturated: due.length === BATCH_SIZE,
  });
};
