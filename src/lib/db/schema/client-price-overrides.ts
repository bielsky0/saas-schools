import { sql } from "drizzle-orm";
import { boolean, date, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { client } from "./clients";
import { groupType } from "./group-types";
import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Client price override — an individually negotiated discount for a specific
 * client (F21, EPIK 33, §2.31).
 *
 * Admin grants a client-specific price override (percent discount or fixed
 * price) from the client profile. The override applies automatically at the
 * price-resolution point (resolvePrice) and is visible before payment
 * (US-4.2/AC4–AC6).
 *
 * Resolution order (Constraint 9, §1.3):
 *   1. client_price_override WHERE (client_id, group_type_id)
 *      AND is_active = true AND valid_from <= now()
 *      AND (valid_until IS NULL OR valid_until >= now())
 *   2. client_price_override WHERE (client_id, group_type_id IS NULL)
 *      AND is_active = true AND valid_from <= now()
 *      AND (valid_until IS NULL OR valid_until >= now())
 *   3. No match → catalog price (group_type.price / product_template.price)
 *
 * Override types:
 *   - "percent_discount": value is a percentage (e.g. 15 = 15% off).
 *     Applied as Math.round(basePrice * (1 - value / 100)).
 *     Differs from FLOOR in F20 (informational wages vs real money).
 *   - "fixed_price": value is the final price in minor units, replacing
 *     the catalog price entirely.
 *
 * ⚠️ UNIQUE uses NULLS NOT DISTINCT (Postgres 15+) so that NULL group_type_id
 * (academy-wide override) does not allow two active records for the same
 * (organization, client) pair. Without this, two simultaneous grants could
 * each produce an active academy-wide override and the constraint would not
 * catch it — same fix as trainer_rate (F20).
 *
 * Subscription lifecycle (Rozstrzygnięcie #20):
 *   - Initial checkout uses price_data with proration_behavior: none
 *   - Renewals re-evaluate the active override via pricing.sync_subscription_price
 *     job, triggered by: (a) grant/update of override, (b) change to catalog
 *     price for clients with active percent_discount, (c) scheduled cron for
 *     expired valid_until.
 */
export const clientPriceOverride = pgTable(
  "client_price_override",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The client (parent) who receives the override. */
    clientId: text("clientId")
      .notNull(),
    /**
     * Nullable: NULL = academy-wide (applies to all group types).
     * NOT NULL = override for a specific offer.
     */
    groupTypeId: text("groupTypeId"),
    /** "percent_discount" or "fixed_price". */
    overrideType: text("overrideType")
      .$type<"percent_discount" | "fixed_price">()
      .notNull(),
    /**
     * For percent_discount: the percentage (e.g. 15 = 15% off).
     * For fixed_price: the final price in minor units.
     */
    value: integer("value").notNull(),
    /** When the override starts (inclusive). Defaults to today. */
    validFrom: date("validFrom").notNull(),
    /** When the override ends (inclusive). Null = no expiry. */
    validUntil: date("validUntil"),
    /** Mandatory reason for the discount — same pattern as credits.manual_grant. */
    reason: text("reason").notNull(),
    /** Which user granted this override. */
    grantedByUserId: text("grantedByUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Soft toggle — false means the override is deactivated but kept for history. */
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("client_price_override_active_uq")
      .on(t.organizationId, t.clientId, t.groupTypeId)
      .where(sql`"isActive" = true`),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "client_price_override_client_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.groupTypeId, t.organizationId],
      foreignColumns: [groupType.id, groupType.organizationId],
      name: "client_price_override_group_type_fk",
    }).onDelete("restrict"),
    index("client_price_override_org_idx").on(t.organizationId),
    index("client_price_override_client_idx").on(t.clientId),
    index("client_price_override_active_idx").on(t.isActive),
  ],
);
