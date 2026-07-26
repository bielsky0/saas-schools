import { foreignKey, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { booking } from "./bookings";
import { client } from "./clients";
import { groupType } from "./group-types";
import { organization } from "./organizations";

/**
 * Interest signup — a lightweight intent record before a schedule exists
 * (langlion §2.34, §2.39, EPIK 36, spec v17, Faza 22).
 *
 * Created when a parent submits interest in a `collecting_interest` offer —
 * BEFORE any session, pricing, or payment. No booking row, no credit entry.
 * Unique per (group_type, athlete) for idempotency (Constraint 13): submitting
 * the same child to the same offer a second time is a no-op.
 *
 * An admin converts an interest_signup into a real booking through
 * `createBooking` with full §5 protection (Rozstrzygnięcie #25). After
 * conversion, `converted_booking_id` and `converted_at` are set, and the row
 * stays for audit traceability — never deleted. The two columns are always
 * both NULL or both set (enforced by a CHECK constraint in the migration).
 */
export const interestSignup = pgTable(
  "interest_signup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    groupTypeId: text("group_type_id").notNull(),
    clientId: text("client_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    convertedBookingId: text("converted_booking_id"),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
  },
  (t) => [
    unique("interest_signup_id_org_uq").on(t.id, t.organizationId),
    unique("interest_signup_gt_athlete_uq").on(t.groupTypeId, t.athleteId),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "interest_signup_group_type_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "interest_signup_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "interest_signup_athlete_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.convertedBookingId, t.organizationId],
      foreignColumns: [booking.id, booking.organizationId],
      name: "interest_signup_booking_fk",
    }).onDelete("set null"),
    index("interest_signup_org_idx").on(t.organizationId),
    index("interest_signup_client_idx").on(t.clientId),
  ],
);
