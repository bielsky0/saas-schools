import { and, asc, eq, gt, inArray, ne } from "drizzle-orm";

import { athlete, booking, classSession, creditType, groupType } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { claimCredit, spendCredit } from "@/features/credits/consume";
import { createBooking, type CreateBookingInput } from "@/features/bookings/create";

const log = createLogger("billing:auto-fill");

export interface AutoFillResult {
  settled: number;
  filled: number;
  creditsConsumed: number;
  skipped: Map<string, string>;
}

export interface AutoFillInput {
  organizationId: string;
  clientId: string;
  clientEmail: string;
  creditTypeId: string;
  currency: string;
  athleteId: string | null;
  now?: Date;
}

/**
 * Run the auto-fill pipeline after a package purchase has committed.
 *
 * PHASE ORDER (§7.5a): booked-offline settlement first (one transaction),
 * then auto-booking of upcoming sessions (per-booking mini-transactions).
 * A parent who committed at the desk sees that honoured before the system
 * books future sessions for them.
 *
 * Phase 1 runs in a single transaction — all or nothing. If credits run out,
 * the remaining booked-offline bookings stay unconfirmed. Phase 2 runs each
 * booking attempt in its OWN transaction so a single capacity conflict
 * (SessionFullError) or overlap violation (§5.3) only rolls back that one
 * attempt. The credit row lock is released on rollback and the credit stays
 * `available` for the next attempt or for manual spending.
 *
 * CREDITS NOT CONSUMED remain `available` — the parent can use them manually
 * through the regular booking path. This function never deletes or refunds.
 *
 * CONCURRENCY: claimCredit takes FOR UPDATE SKIP LOCKED. Two concurrent
 * auto-fill calls for the same client contend on credits. The per-booking
 * transaction model means a contended credit is simply skipped — the next
 * booking attempt picks a different credit.
 */
export async function autoFillCredits(input: AutoFillInput): Promise<AutoFillResult> {
  const now = input.now ?? new Date();
  const result: AutoFillResult = { settled: 0, filled: 0, creditsConsumed: 0, skipped: new Map() };

  // Resolve group type + children outside of any booking transaction.
  const resolved = await withTenant(input.organizationId, async (tx) => {
    const [ct] = await tx
      .select({ groupTypeId: creditType.groupTypeId })
      .from(creditType)
      .where(
        and(eq(creditType.id, input.creditTypeId), eq(creditType.organizationId, input.organizationId)),
      )
      .limit(1);
    if (!ct) return null;

    const [gtRow] = await tx
      .select({
        id: groupType.id,
        price: groupType.price,
        paymentPolicy: groupType.paymentPolicy,
        allowedPurchaseModes: groupType.allowedPurchaseModes,
      })
      .from(groupType)
      .where(
        and(eq(groupType.id, ct.groupTypeId), eq(groupType.organizationId, input.organizationId)),
      )
      .limit(1);
    if (!gtRow) return null;

    if (!gtRow.allowedPurchaseModes.includes("single_class")) {
      log.info("auto-fill: group type is packages-only, skipping", { groupTypeId: gtRow.id });
      return null;
    }

    const children = await tx
      .select({ id: athlete.id, name: athlete.name })
      .from(athlete)
      .where(
        and(
          eq(athlete.parentClientId, input.clientId),
          eq(athlete.organizationId, input.organizationId),
        ),
      )
      .orderBy(asc(athlete.name));

    if (children.length === 0) return null;

    const targetAthletes = input.athleteId
      ? children.filter((c) => c.id === input.athleteId)
      : children;

    if (targetAthletes.length === 0) return null;

    return {
      groupTypeId: ct.groupTypeId,
      groupTypeInput: {
        id: gtRow.id,
        price: gtRow.price,
        paymentPolicy: gtRow.paymentPolicy,
        allowedPurchaseModes: gtRow.allowedPurchaseModes,
        requiresQualificationCard: false,
      } satisfies CreateBookingInput["groupType"],
      targetAthletes,
    };
  });

  if (!resolved) {
    log.warn("auto-fill: resolution failed", { creditTypeId: input.creditTypeId });
    return result;
  }

  const { groupTypeId, groupTypeInput, targetAthletes } = resolved;

  /* ── Phase 1: Settle booked-offline bookings (single transaction) ───── */

  await withTenant(input.organizationId, async (tx) => {
    const bookedOffline = await tx
      .select({ id: booking.id, athleteId: booking.athleteId })
      .from(booking)
      .innerJoin(
        classSession,
        and(
          eq(classSession.id, booking.sessionId),
          eq(classSession.organizationId, input.organizationId),
          eq(classSession.groupTypeId, groupTypeId),
        ),
      )
      .where(
        and(
          eq(booking.organizationId, input.organizationId),
          eq(booking.paymentStatus, "booked_offline"),
        ),
      );

    const athleteIds = new Set(targetAthletes.map((a) => a.id));
    const relevant = bookedOffline.filter((b) => athleteIds.has(b.athleteId));

    for (const bookingRow of relevant) {
      const claimed = await claimCredit(tx, {
        organizationId: input.organizationId,
        clientId: input.clientId,
        creditTypeId: input.creditTypeId,
        athleteId: bookingRow.athleteId,
        now,
      });
      if (!claimed) {
        log.info("auto-fill: credits exhausted during booked-offline settlement", {
          settled: result.settled,
        });
        return;
      }

      await spendCredit(tx, {
        organizationId: input.organizationId,
        creditId: claimed.id,
        bookingId: bookingRow.id,
      });

      await tx
        .update(booking)
        .set({ paymentStatus: "confirmed", updatedAt: now })
        .where(
          and(eq(booking.id, bookingRow.id), eq(booking.organizationId, input.organizationId)),
        );

      result.creditsConsumed++;
      result.settled++;
    }
  });

  /* ── Phase 2: Auto-book upcoming sessions (per-booking transactions) ─── */

  const upcomingSessions = await withTenant(input.organizationId, async (tx) =>
    tx
      .select({ id: classSession.id, startTime: classSession.startTime })
      .from(classSession)
      .where(
        and(
          eq(classSession.organizationId, input.organizationId),
          eq(classSession.groupTypeId, groupTypeId),
          eq(classSession.status, "scheduled"),
          gt(classSession.startTime, now),
        ),
      )
      .orderBy(asc(classSession.startTime)),
  );

  if (upcomingSessions.length === 0) {
    log.info("auto-fill: no upcoming sessions", { groupTypeId });
    return result;
  }

  const sessionIds = upcomingSessions.map((s) => s.id);
  const existingBookings = await withTenant(input.organizationId, async (tx) =>
    tx
      .select({ sessionId: booking.sessionId, athleteId: booking.athleteId })
      .from(booking)
      .where(
        and(
          eq(booking.organizationId, input.organizationId),
          inArray(booking.sessionId, sessionIds),
          ne(booking.paymentStatus, "cancelled"),
        ),
      ),
  );
  const bookedPairs = new Set(existingBookings.map((b) => `${b.sessionId}:${b.athleteId}`));

  for (const session of upcomingSessions) {
    for (const child of targetAthletes) {
      if (bookedPairs.has(`${session.id}:${child.id}`)) continue;

      // Each booking attempt is its own transaction — a single capacity
      // conflict or overlap violation only rolls back this one attempt.
      try {
        await withTenant(input.organizationId, async (tx) => {
          const claimed = await claimCredit(tx, {
            organizationId: input.organizationId,
            clientId: input.clientId,
            creditTypeId: input.creditTypeId,
            athleteId: child.id,
            now,
          });
          if (!claimed) return Promise.reject(new NoCreditError());

          const { bookingId } = await createBooking(tx, {
            organizationId: input.organizationId,
            groupType: groupTypeInput,
            currency: input.currency,
            client: { id: input.clientId, email: input.clientEmail },
            sessionId: session.id,
            paymentMethod: "on_site",
            participant: { kind: "existing", athleteId: child.id },
            onlineAvailable: true,
            now,
          });

          await spendCredit(tx, {
            organizationId: input.organizationId,
            creditId: claimed.id,
            bookingId,
          });

          await tx
            .update(booking)
            .set({ paymentStatus: "confirmed", updatedAt: now })
            .where(
              and(eq(booking.id, bookingId), eq(booking.organizationId, input.organizationId)),
            );
        });

        result.filled++;
        result.creditsConsumed++;
      } catch (err) {
        // NoCreditError → credits exhausted, stop entirely.
        if (err instanceof NoCreditError) {
          log.info("auto-fill: credits exhausted", { filled: result.filled });
          return result;
        }
        // SessionFullError, overlap violation, etc → skip this one pair,
        // the credit is auto-rolled-back and stays available.
        const reason = err instanceof Error ? err.constructor.name : String(err);
        result.skipped.set(`${session.id}:${child.id}`, reason);
      }
    }
  }

  log.info("auto-fill complete", {
    clientId: input.clientId,
    settled: result.settled,
    filled: result.filled,
    skipped: result.skipped.size,
  });

  return result;
}

class NoCreditError extends Error {
  constructor() {
    super("no credits available");
  }
}
