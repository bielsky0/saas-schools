import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { booking } from "./bookings";
import { classSession } from "./class-sessions";
import { client } from "./clients";
import { groupType } from "./group-types";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * One-time ad-hoc charge unrelated to sessions/packages (Faza 27, §2.41, EPIK 42).
 *
 * Intentionally OUTSIDE the credit system — never generates nor consumes credit,
 * never appears in the client wallet (§7.12). Rozstrzygnięcie #35: this is not
 * an exception to Zasada #2 (credit trail for bookings) because extra_fee is not
 * a booking — it is an entity of a different nature.
 *
 * Payment: online (Connect ad-hoc price_data, Constraint 7) or cash (staff confirmed).
 * Correction: cancel/soft-delete only — no Stripe Refund (Rozstrzygnięcie #33).
 * Invoicing: same manual process as credit_purchase (§2.17, Rozstrzygnięcie #36).
 *
 * Soft delete: is_active + deleted_at (like policy_document).
 */
export const extraFee = pgTable(
  "extra_fee",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    athleteId: text("athlete_id"),
    bookingId: text("booking_id"),
    groupTypeId: text("group_type_id"),
    sessionId: text("session_id"),
    amount: integer("amount").notNull(),
    currencySnapshot: jsonb("currency_snapshot")
      .$type<{ amount: number; currency: string }>()
      .notNull(),
    description: text("description").notNull(),
    status: text("status")
      .$type<"pending" | "paid" | "cancelled">()
      .notNull()
      .default("pending"),
    paymentMethod: text("payment_method")
      .$type<"online" | "cash">()
      .notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    invoiceRequestedAt: timestamp("invoice_requested_at"),
    invoiceIssuedAt: timestamp("invoice_issued_at"),
    invoiceNumber: text("invoice_number"),
    invoiceIssuedByUserId: text("invoice_issued_by_user_id"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "extra_fee_client_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "extra_fee_athlete_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.bookingId, t.organizationId],
      foreignColumns: [booking.id, booking.organizationId],
      name: "extra_fee_booking_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "extra_fee_group_type_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.sessionId, t.organizationId],
      foreignColumns: [classSession.id, classSession.organizationId],
      name: "extra_fee_session_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.createdByUserId],
      foreignColumns: [user.id],
      name: "extra_fee_created_by_user_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.invoiceIssuedByUserId],
      foreignColumns: [user.id],
      name: "extra_fee_invoice_issued_by_user_fk",
    }).onDelete("set null"),
    index("extra_fee_org_idx").on(t.organizationId),
    index("extra_fee_client_idx").on(t.clientId),
    index("extra_fee_session_idx").on(t.sessionId),
    index("extra_fee_status_idx").on(t.status),
  ],
);
