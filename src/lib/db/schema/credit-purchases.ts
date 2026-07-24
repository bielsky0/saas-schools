import { foreignKey, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { athlete } from "./athletes";
import { user } from "./auth";
import { client } from "./clients";
import { clientSubscription } from "./client-subscriptions";
import { organization } from "./organizations";
import { productTemplate } from "./product-templates";

/**
 * Credit purchase — a journal entry recording a package sale (F12).
 *
 * Every time a client buys a package — cash at the desk, one-time online,
 * or a subscription renewal — a row lands here. `credit.creditPurchaseId`
 * points back here, so the set of credits issued per purchase is trivially
 * queryable.
 *
 * `paymentMethod` records how the package was paid for. The three paths:
 *   - "cash" — reception confirms the purchase (sub-phase b)
 *   - "online_one_time" — webhook from Connect checkout (sub-phase c)
 *   - "subscription" — webhook from invoice.paid on Connect (sub-phase d)
 *
 * `clientSubscriptionId` is set only for subscription-based purchases and
 * links all credit batches from the same subscription lifecycle.
 */
export const creditPurchase = pgTable(
  "credit_purchase",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The client who bought the package. */
    clientId: text("client_id").notNull(),
    /** Which product template was purchased. */
    productTemplateId: text("product_template_id").notNull(),
    /** The subscription this purchase belongs to. Null for one-time/cash. */
    clientSubscriptionId: text("client_subscription_id"),
    /** Which child the credits should be reserved for. Null = family wallet. */
    athleteId: text("athlete_id"),
    /** How many credits were issued in this purchase. */
    quantity: integer("quantity").notNull(),
    /** How the purchase was paid for. */
    paymentMethod: text("payment_method")
      .$type<"cash" | "online_one_time" | "subscription">()
      .notNull(),
    /** The Stripe Checkout Session id for online purchases. */
    stripeSessionId: text("stripe_session_id"),
    /** The Stripe PaymentIntent id (pi_xxx). Set at refund initiation time for online/webhook matching. */
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    /** Amount paid in minor units — used in the refund formula ((unused / purchased) × price_paid). */
    pricePaid: integer("price_paid").notNull(),
    /** Moment the admin clicked "initiate refund". */
    refundInitiatedAt: timestamp("refund_initiated_at"),
    /** Which refund variant was selected at initiation time. */
    refundVariant: text("refund_variant").$type<"partial" | "full_reversal">(),
    /** Moment the refund was confirmed (webhook for online, admin click for cash). */
    refundedAt: timestamp("refunded_at"),
    /** Calculated refund amount in minor units. */
    refundAmount: integer("refund_amount"),
    /** Who confirmed the cash refund. Null for online (webhook-driven). */
    refundConfirmedByUserId: text("refund_confirmed_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("credit_purchase_id_org_uq").on(t.id, t.organizationId),
    foreignKey({
      columns: [t.clientId, t.organizationId],
      foreignColumns: [client.id, client.organizationId],
      name: "credit_purchase_client_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.productTemplateId, t.organizationId],
      foreignColumns: [productTemplate.id, productTemplate.organizationId],
      name: "credit_purchase_product_template_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.athleteId, t.organizationId],
      foreignColumns: [athlete.id, athlete.organizationId],
      name: "credit_purchase_athlete_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.clientSubscriptionId],
      foreignColumns: [clientSubscription.id],
      name: "credit_purchase_client_subscription_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.refundConfirmedByUserId],
      foreignColumns: [user.id],
      name: "credit_purchase_refund_confirmed_by_fk",
    }).onDelete("set null"),
    index("credit_purchase_org_idx").on(t.organizationId),
    index("credit_purchase_client_idx").on(t.clientId),
    index("credit_purchase_subscription_idx").on(t.clientSubscriptionId),
  ],
);
