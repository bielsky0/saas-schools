import { foreignKey, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { groupType } from "./group-types";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Trainer rate — purely informational wage record (F20, EPIK 32, §2.30).
 *
 * NOT a payroll system. Does not create any payment, transfer or operation on
 * either Stripe account (Zasada nadrzędna #7). This is a report calculator:
 * it computes what the academy owes each trainer for a given period, and
 * settlement happens outside the system.
 *
 * `amount` is a flat fee per session (flat_per_session) or per hour (hourly)
 * depending on `rate_type`, in minor units of `organization.currency`.
 *
 * Changes are NEVER retroactive: a new effective_from creates a new row, and
 * the report for a past period uses the rate in effect on the session date
 * (same non-retroactivity pattern as price, Zasada nadrzędna #1).
 *
 * Constraint 8 (§1.3) resolution order:
 *   1. trainer_rate WHERE (trainer_id, group_type_id)
 *      WITH effective_from <= session.start_time
 *      ORDER BY effective_from DESC LIMIT 1
 *   2. trainer_rate WHERE (trainer_id, group_type_id IS NULL)
 *      WITH effective_from <= session.start_time
 *      ORDER BY effective_from DESC LIMIT 1
 *   3. No match → session goes to "no rate" list (never zero, never silent)
 *
 * ⚠️ UNIQUE uses NULLS NOT DISTINCT (Postgres 15+) so that NULL group_type_id
 * (base rate) does not allow duplicate (organization, trainer, effective_from)
 * rows. Without this, two admin-writers in the same second could each create
 * a base rate for the same trainer and the constraint would not catch it.
 */
export const trainerRate = pgTable(
  "trainer_rate",
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
    /** Nullable = base rate (applies to all group types). NOT NULL = override per group type. */
    groupTypeId: text("groupTypeId"),
    amount: integer("amount").notNull(),
    effectiveFrom: timestamp("effectiveFrom", { withTimezone: true }).notNull(),
    rateType: text("rateType")
      .$type<"flat_per_session" | "hourly">()
      .notNull()
      .default("flat_per_session"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    unique("trainer_rate_id_org_uq").on(t.id, t.organizationId),
    unique("trainer_rate_base_uq")
      .on(t.organizationId, t.trainerId, t.groupTypeId, t.effectiveFrom)
      .nullsNotDistinct(),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "trainer_rate_group_type_fk",
    }).onDelete("restrict"),
    index("trainer_rate_org_idx").on(t.organizationId),
    index("trainer_rate_trainer_idx").on(t.trainerId),
  ],
);
