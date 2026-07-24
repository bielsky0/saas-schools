import { foreignKey, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { booking } from "./bookings";
import { classSession } from "./class-sessions";
import { client } from "./clients";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Group change request — Proces B, swap grupy (Faza 15, EPIK 11, §2.7).
 *
 * Pełny cykl życia: submitted → admin_approved/admin_rejected → awaiting_payment
 * → completed/expired/cancelled_by_*.
 *
 * `price_difference` jest wyliczany i frozen przy `admin_approved`:
 *   - > 0 → surcharge, klient płaci przez Stripe Checkout
 *   - = 0 → natychmiastowy swap, bez płatności
 *   - < 0 → swap + issue credit, zwrot fiducjarny w F16
 *
 * `resulting_booking_id` jest tworzony przy `admin_approved`:
 *   - dla price_diff ≠ 0: booking w `payment_pending` (blokuje miejsce)
 *   - dla price_diff == 0: booking w `confirmed` (swap finalny)
 *
 * Mutual exclusion z cancellation: booking może mieć otwarty group_change_request
 * LUB cancellation, nigdy oba naraz (US-11.8).
 */
export const groupChangeRequestStatus = [
  "submitted",
  "admin_approved",
  "admin_rejected",
  "awaiting_payment",
  "completed",
  "expired",
  "cancelled_by_admin",
  "cancelled_by_client",
] as const;

export type GroupChangeRequestStatus = (typeof groupChangeRequestStatus)[number];

export const groupChangeRequest = pgTable(
  "group_change_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The client who initiated the request. */
    clientId: text("clientId").notNull(),
    /** The current booking being swapped out. */
    sourceBookingId: text("sourceBookingId").notNull(),
    /** The desired session the client wants to move to. */
    targetSessionId: text("targetSessionId").notNull(),
    status: text("status")
      .$type<GroupChangeRequestStatus>()
      .notNull()
      .default("submitted"),
    /** Calculated and frozen at `admin_approved`. Positive = surcharge, negative = refund, zero = no payment. */
    priceDifference: integer("priceDifference"),
    /** The new booking on the target session, created at `admin_approved`. */
    resultingBookingId: text("resultingBookingId"),
    /** Stripe PaymentIntent id for price_diff > 0. */
    stripePaymentIntentId: text("stripePaymentIntentId"),
    /** Set at `admin_approved` when price_diff > 0: expires 24h from now. */
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    submittedAt: timestamp("submittedAt").notNull().defaultNow(),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    rejectionReason: text("rejectionReason"),
    cancelledByUserId: text("cancelledByUserId"),
    cancellationReason: text("cancellationReason"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("group_change_request_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "group_change_request_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.sourceBookingId, t.organizationId],
      foreignColumns: [booking.id, booking.organizationId],
      name: "group_change_request_source_booking_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.targetSessionId, t.organizationId],
      foreignColumns: [classSession.id, classSession.organizationId],
      name: "group_change_request_target_session_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.resultingBookingId, t.organizationId],
      foreignColumns: [booking.id, booking.organizationId],
      name: "group_change_request_resulting_booking_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.reviewedByUserId],
      foreignColumns: [user.id],
      name: "group_change_request_reviewed_by_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.cancelledByUserId],
      foreignColumns: [user.id],
      name: "group_change_request_cancelled_by_fk",
    }).onDelete("set null"),
    index("group_change_request_org_idx").on(t.organizationId),
    index("group_change_request_source_booking_idx").on(t.sourceBookingId),
    index("group_change_request_target_session_idx").on(t.targetSessionId),
    index("group_change_request_status_idx").on(t.status),
  ],
);
