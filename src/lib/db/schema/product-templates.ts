import { boolean, foreignKey, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { creditType } from "./credit-types";
import { organization } from "./organizations";

/**
 * Product template — a package definition (F12, EPIK 9/23).
 *
 * Each row defines how many class credits a client buys, at what price, and
 * whether the billing is one-time or recurring. The link to a specific offer is
 * through `creditTypeId`, which is 1:1 with a `group_type` — so one template =
 * one kind of class. Two academies may sell the same bundle at different prices,
 * and the `organizationId` carries that isolation.
 *
 * `stripePriceId` is NULLABLE per Rozstrzygnięcie #20: the checkout path MUST
 * support ad-hoc `price_data` from the start, not just a pre-created Stripe
 * Price. This is the only way to express per-client discounts that vary between
 * cycles (§2.31).
 *
 * Constraint 4 (billingType ⊆ group_type.allowedBillingTypes) is enforced at
 * the application layer through a join, not as a column on this table — the
 * source of truth is `group_type.allowedBillingTypes`, and duplicating it would
 * desync on the first `group_type` edit.
 */
export const productTemplate = pgTable(
  "product_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** 1:1 with a group_type through credit_type — defines what class this package is for. */
    creditTypeId: text("credit_type_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Price in minor units (grosze, cents). Amount the client pays. */
    price: integer("price").notNull(),
    /** How many class credits this package provides. */
    creditQuantity: integer("credit_quantity").notNull(),
    /** One-time payment or recurring subscription. */
    billingType: text("billing_type").$type<"one_time" | "recurring">().notNull(),
    /** Stripe Price id on the Connected Account. Nullable — price_data is the
     *  alternative per Rozstrzygnięcie #20. At least one of stripePriceId /
     *  ad-hoc price must be available at checkout time. */
    stripePriceId: text("stripe_price_id"),
    /** Whether this template is currently offered to clients. */
    isActive: boolean("is_active").notNull().default(true),
    /** Billing interval for recurring templates only. */
    interval: text("interval").$type<"month" | "year">(),
    /** Number of intervals between billing cycles (e.g. 3 = quarterly). */
    intervalCount: integer("interval_count"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("product_template_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.creditTypeId, t.organizationId],
      foreignColumns: [creditType.id, creditType.organizationId],
      name: "product_template_credit_type_fk",
    }).onDelete("restrict"),
    index("product_template_org_idx").on(t.organizationId),
    index("product_template_credit_type_idx").on(t.creditTypeId),
  ],
);
