import { and, eq } from "drizzle-orm";

import { clientActor, recordAudit, SYSTEM_ACTOR } from "@/features/admin/audit";
import { booking, classSession, waitlistEntry } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export const WAITLIST_OFFER_TTL_MS = 2 * 60 * 60 * 1000;

export class SessionNotFullError extends Error {
  override name = "SessionNotFullError";
  constructor() {
    super("Session is not full — no waitlist slot to offer");
  }
}

export class DuplicateWaitlistEntryError extends Error {
  override name = "DuplicateWaitlistEntryError";
  constructor() {
    super("Athlete is already on the waitlist for this session");
  }
}

export class WaitlistNotEnabledError extends Error {
  override name = "WaitlistNotEnabledError";
  constructor() {
    super("Waitlist is not enabled for this group type");
  }
}

/**
 * Join the waitlist for a full session.
 *
 * Called when a session is at capacity and `group_type.waitlist_enabled=true`.
 * Creates a `waiting` entry — free, no credit consumed. Idempotent per
 * (session_id, athlete_id) — a second call returns the existing entry.
 */
export async function joinWaitlist(
  tx: TenantDb,
  input: {
    organizationId: string;
    sessionId: string;
    clientId: string;
    athleteId: string;
    clientEmail?: string;
  },
) {
  const existing = await tx
    .select({ id: waitlistEntry.id })
    .from(waitlistEntry)
    .where(
      and(
        eq(waitlistEntry.sessionId, input.sessionId),
        eq(waitlistEntry.athleteId, input.athleteId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!.id;
  }

  const [row] = await tx
    .insert(waitlistEntry)
    .values({
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      clientId: input.clientId,
      athleteId: input.athleteId,
      status: "waiting",
    })
    .returning({ id: waitlistEntry.id });

  if (!row) return null;

  const actor = input.clientEmail ? clientActor(input.clientEmail) : SYSTEM_ACTOR;
  await recordAudit(tx, {
    action: "waitlist.join",
    actor,
    organizationId: input.organizationId,
    targetType: "waitlist_entry",
    targetId: row.id,
    targetLabel: row.id,
    metadata: { sessionId: input.sessionId, athleteId: input.athleteId },
  });

  return row.id;
}

/**
 * Offer a freed seat to the first waiting athlete.
 *
 * Called INSIDE the same transaction that cancels a booking and frees a seat
 * (the same `SELECT ... FOR UPDATE` on the session row from §5.2). Finds the
 * first `waiting` entry by `created_at` (`SKIP LOCKED`), transitions it to
 * `offered`, creates a `payment_pending` booking to hold the seat.
 *
 * Returns the waitlist entry id if one was offered, or null if no one is waiting.
 */
export async function offerNextWaitlisted(
  tx: TenantDb,
  input: {
    organizationId: string;
    sessionId: string;
    priceSnapshot: { amount: number; currency: string };
    now?: Date;
  },
): Promise<{ waitlistEntryId: string; bookingId: string } | null> {
  const now = input.now ?? new Date();

  const [next] = await tx
    .select({
      id: waitlistEntry.id,
      clientId: waitlistEntry.clientId,
      athleteId: waitlistEntry.athleteId,
    })
    .from(waitlistEntry)
    .where(
      and(
        eq(waitlistEntry.sessionId, input.sessionId),
        eq(waitlistEntry.organizationId, input.organizationId),
        eq(waitlistEntry.status, "waiting"),
      ),
    )
    .orderBy(waitlistEntry.createdAt)
    .limit(1)
    .for("update", { skipLocked: true });

  if (!next) return null;

  const offerExpiresAt = new Date(now.getTime() + WAITLIST_OFFER_TTL_MS);

  const [sessionRow] = await tx
    .select({
      startTime: classSession.startTime,
      endTime: classSession.endTime,
    })
    .from(classSession)
    .where(
      and(
        eq(classSession.id, input.sessionId),
        eq(classSession.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!sessionRow) return null;

  const [bookingRow] = await tx
    .insert(booking)
    .values({
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      athleteId: next.athleteId,
      paymentStatus: "payment_pending",
      priceSnapshot: input.priceSnapshot,
      sessionStartTime: sessionRow.startTime,
      sessionEndTime: sessionRow.endTime,
    })
    .returning({ id: booking.id });

  if (!bookingRow) return null;

  await tx
    .update(waitlistEntry)
    .set({
      status: "offered",
      offeredAt: now,
      offerExpiresAt,
      resultingBookingId: bookingRow.id,
    })
    .where(eq(waitlistEntry.id, next.id));

  await recordAudit(tx, {
    action: "waitlist.offer",
    actor: SYSTEM_ACTOR,
    organizationId: input.organizationId,
    targetType: "waitlist_entry",
    targetId: next.id,
    targetLabel: next.id,
    metadata: {
      sessionId: input.sessionId,
      athleteId: next.athleteId,
      bookingId: bookingRow.id,
      offerExpiresAt: offerExpiresAt.toISOString(),
    },
  });

  return { waitlistEntryId: next.id, bookingId: bookingRow.id };
}

/**
 * Confirm a waitlist offer — the client has paid.
 *
 * Called AFTER the normal booking confirmation flow completes. Updates the
 * waitlist entry to `converted` and links the resulting booking.
 */
export async function confirmWaitlistOffer(
  tx: TenantDb,
  input: {
    organizationId: string;
    waitlistEntryId: string;
    bookingId: string;
    actor: { actorType: "Client" | "System"; actorId: string | null; actorEmail: string };
  },
) {
  const [row] = await tx
    .update(waitlistEntry)
    .set({
      status: "converted",
      resultingBookingId: input.bookingId,
    })
    .where(
      and(
        eq(waitlistEntry.id, input.waitlistEntryId),
        eq(waitlistEntry.organizationId, input.organizationId),
        eq(waitlistEntry.status, "offered"),
      ),
    )
    .returning({ id: waitlistEntry.id });

  if (!row) return;

  await recordAudit(tx, {
    action: "waitlist.converted",
    actor: input.actor,
    organizationId: input.organizationId,
    targetType: "waitlist_entry",
    targetId: row.id,
    targetLabel: row.id,
    metadata: { bookingId: input.bookingId },
  });
}

/**
 * Expire a single waitlist offer — called by the expiry job.
 *
 * Cancels the associated `payment_pending` booking, transitions the entry to
 * `expired`, and offers the seat to the next in line recursively.
 */
export async function expireWaitlistOffer(
  tx: TenantDb,
  input: {
    organizationId: string;
    entryId: string;
    priceSnapshot: { amount: number; currency: string };
    now?: Date;
  },
): Promise<{ offeredNext: boolean }> {
  const now = input.now ?? new Date();

  const [entry] = await tx
    .select({
      id: waitlistEntry.id,
      sessionId: waitlistEntry.sessionId,
      resultingBookingId: waitlistEntry.resultingBookingId,
    })
    .from(waitlistEntry)
    .where(
      and(
        eq(waitlistEntry.id, input.entryId),
        eq(waitlistEntry.organizationId, input.organizationId),
        eq(waitlistEntry.status, "offered"),
      ),
    )
    .limit(1);

  if (!entry) return { offeredNext: false };

  if (entry.resultingBookingId) {
    await tx
      .update(booking)
      .set({ paymentStatus: "cancelled", updatedAt: now })
      .where(
        and(
          eq(booking.id, entry.resultingBookingId),
          eq(booking.organizationId, input.organizationId),
          eq(booking.paymentStatus, "payment_pending"),
        ),
      );
  }

  await tx
    .update(waitlistEntry)
    .set({
      status: "expired",
      resultingBookingId: null,
    })
    .where(eq(waitlistEntry.id, entry.id));

  await recordAudit(tx, {
    action: "waitlist.offer_expired",
    actor: SYSTEM_ACTOR,
    organizationId: input.organizationId,
    targetType: "waitlist_entry",
    targetId: entry.id,
    targetLabel: entry.id,
    metadata: { sessionId: entry.sessionId },
  });

  const next = await offerNextWaitlisted(tx, {
    organizationId: input.organizationId,
    sessionId: entry.sessionId,
    priceSnapshot: input.priceSnapshot,
    now,
  });

  return { offeredNext: next !== null };
}
