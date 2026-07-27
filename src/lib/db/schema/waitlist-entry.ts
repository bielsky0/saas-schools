import { foreignKey, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { booking } from "./bookings";
import { classSession } from "./class-sessions";
import { client } from "./clients";
import { organization } from "./organizations";

/**
 * Waitlist entry — a parent queues their child for a full session (langlion
 * §2.34a, Faza 33).
 *
 * Created when a session is at capacity AND `group_type.waitlist_enabled=true`.
 * Free — no credit consumed, no payment. Unique per (session_id, athlete_id)
 * for idempotency (Constraint 20): submitting the same child to the same full
 * session a second time is a no-op.
 *
 * When a seat frees up (cancellation), the first `waiting` entry by `created_at`
 * transitions to `offered` with a 2h TTL (`WAITLIST_OFFER_TTL_MS`) and a
 * `payment_pending` booking is created to hold the seat. If the offer expires,
 * the slot is offered to the next in line recursively.
 *
 * position is NOT a stored column — computed at read time via
 * ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at).
 */
export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: text("sessionId").notNull(),
    clientId: text("clientId").notNull(),
    athleteId: text("athleteId").notNull(),
    status: text("status")
      .$type<"waiting" | "offered" | "expired" | "converted" | "cancelled">()
      .notNull()
      .default("waiting"),
    offeredAt: timestamp("offeredAt", { withTimezone: true }),
    offerExpiresAt: timestamp("offerExpiresAt", { withTimezone: true }),
    resultingBookingId: text("resultingBookingId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    unique("waitlist_entry_id_org_uq").on(t.id, t.organizationId),
    unique("waitlist_entry_session_athlete_uq").on(t.sessionId, t.athleteId),
    foreignKey({
      columns: [t.sessionId, t.organizationId],
      foreignColumns: [classSession.id, classSession.organizationId],
      name: "waitlist_entry_session_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "waitlist_entry_client_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "waitlist_entry_athlete_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.resultingBookingId, t.organizationId],
      foreignColumns: [booking.id, booking.organizationId],
      name: "waitlist_entry_booking_fk",
    }).onDelete("set null"),
    index("waitlist_entry_org_idx").on(t.organizationId),
    index("waitlist_entry_session_idx").on(t.sessionId),
    index("waitlist_entry_session_status_idx").on(t.sessionId, t.status),
  ],
);
