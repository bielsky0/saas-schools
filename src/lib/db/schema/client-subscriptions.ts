import { foreignKey, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { client } from "./clients";
import { organization } from "./organizations";
import { productTemplate } from "./product-templates";

/**
 * Client subscription — tracks the lifecycle of a single recurring package (F12d).
 *
 * Created when a client checks out a subscription template on Connect, and
 * updated exclusively by webhooks (invoice.paid, customer.subscription.deleted).
 * Never touched from browser redirects — same pattern as the platform billing
 * `subscription` table.
 *
 * `stripeSubscriptionId` is UNIQUE: Stripe may redeliver invoice.paid, and the
 * lookup by subscription id is what guarantees idempotency (same pattern as
 * `subscription.providerSubscriptionId` in platform billing).
 *
 * `status` values:
 *   - "active" — subscription is live, credits were issued
 *   - "past_due" — invoice.payment_failed, no credits were removed
 *   - "canceled" — customer.subscription.deleted, no further renewals
 *
 * The Customer Portal link (sent on past_due) requires the Stripe customer id,
 * which lives in `client_stripe_customer` — joined via `(clientId, organizationId)`.
 */
export const clientSubscription = pgTable(
  "client_subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The client (parent) who holds the subscription. */
    clientId: text("client_id").notNull(),
    /** Which product template defines this subscription. */
    productTemplateId: text("product_template_id").notNull(),
    /** The Stripe subscription id (sub_xxx) on the Connected Account. UNIQUE for idempotency. */
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    /** Current lifecycle state. */
    status: text("status")
      .$type<"active" | "past_due" | "canceled">()
      .notNull()
      .default("active"),
    /** When the current billing period ends. */
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("client_subscription_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "client_subscription_client_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.productTemplateId, t.organizationId],
      foreignColumns: [productTemplate.id, productTemplate.organizationId],
      name: "client_subscription_product_template_fk",
    }).onDelete("restrict"),
    index("client_subscription_org_idx").on(t.organizationId),
    index("client_subscription_client_idx").on(t.clientId),
  ],
);
