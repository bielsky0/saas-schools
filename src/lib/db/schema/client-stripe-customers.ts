import { foreignKey, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { client } from "./clients";
import { organization } from "./organizations";

/**
 * Client Stripe customer — maps a parent client to their Stripe customer id
 * on the academy's Connected Account (F12, sub-phase d).
 *
 * This is a SEPARATE TABLE from `client_subscription` because the customer
 * belongs to the client–academy pair, not to any one subscription. The same
 * customer identifier is reused across subscriptions the client may hold
 * with the same academy, and the Customer Portal needs the customer id even
 * after all subscriptions are cancelled. Storing it on `client_subscription`
 * would lose it on cancellation.
 *
 * UNIQUE per (organizationId, clientId): one client = one Stripe customer per
 * academy. Created lazily — on the client's first subscription checkout.
 */
export const clientStripeCustomer = pgTable(
  "client_stripe_customer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The client (parent) on the academy's Connect account. */
    clientId: text("client_id").notNull(),
    /** The Stripe customer id (cus_xxx) on the Connected Account. */
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("client_stripe_customer_uq").on(t.organizationId, t.clientId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "client_stripe_customer_client_fk",
    }).onDelete("restrict"),
    index("csc_org_idx").on(t.organizationId),
  ],
);
