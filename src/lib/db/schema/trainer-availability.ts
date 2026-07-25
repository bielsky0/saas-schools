import { boolean, foreignKey, index, integer, pgTable, text, time, timestamp, unique } from "drizzle-orm/pg-core";

import { location } from "./locations";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Trainer availability — per-trainer weekly windows (F17.5, EPIK 34, §2.32).
 *
 * Each row is one weekly window (e.g. "Tuesday 10:00–14:00"). Multiple rows for
 * the same trainer+day accumulate (union). Slot calculation in
 * `features/trainers/availability-slots.ts` unions these windows ∨ default
 * 08:00–20:00, subtracts existing `class_session` rows, and slices by
 * `group_type.default_duration_minutes`.
 *
 * `is_active` = temporarily disabled (trainer on leave, holiday — the window
 * stays in the schedule for quick re-activation).
 * `deleteAvailability` = permanent removal (trainer no longer works that day).
 *
 * `location_id` is informational + future filtering (TODO(F18): filter slots by
 * location when `group_type.defaultLocationId` differs).
 *
 * OVERLAP CHECK: handled at the application layer in the server action, not in
 * an EXCLUDE constraint. `day_of_week` + time range per trainer is a different
 * calibre of complexity than timestamps in `class_session`, and the app-level
 * check + union in `computeAvailabilitySlots` provides double protection.
 */
export const trainerAvailability = pgTable(
  "trainer_availability",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    trainerId: text("trainerId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    dayOfWeek: integer("dayOfWeek").notNull(), // 0=Monday … 6=Sunday
    startTime: time("startTime").notNull(),
    endTime: time("endTime").notNull(),
    locationId: text("locationId"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("trainer_availability_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.locationId, t.organizationId],
      foreignColumns: [location.id, location.organizationId],
      name: "trainer_availability_location_fk",
    }).onDelete("set null"),
    index("trainer_availability_org_idx").on(t.organizationId),
    index("trainer_availability_trainer_idx").on(t.trainerId),
    index("trainer_availability_day_idx").on(t.dayOfWeek),
  ],
);
