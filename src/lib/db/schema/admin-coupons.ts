import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Coupons — discount codes redeemable by an organization, scoped to everyone
 * ('global'), one client group ('group') or one tenant ('organization').
 *
 * GLOBAL table (a coupon applies to potentially many tenants). Writes are
 * bypass-only; reads happen in the cross-tenant coupons module / tenant
 * runtime during redemption. `value` is either a percent (0–100) for type
 * 'percent' or a whole minor-unit amount for type 'amount'.
 */
export const adminCoupon = pgTable(
  "admin_coupon",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    type: text("type").notNull(),
    value: integer("value").notNull(),
    currency: text("currency"),
    expiresAt: timestamp("expires_at"),
    maxActivations: integer("max_activations"),
    scope: text("scope").notNull(),
    scopeId: text("scope_id"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("admin_coupon_code_idx").on(t.code)],
);

/**
 * A completed redemption of a coupon by one organization. `max_activations`
 * enforcement counts rows here. Delete = revoke (audited as
 * `coupon.redemption.remove`).
 */
export const adminCouponRedemption = pgTable(
  "admin_coupon_redemption",
  {
    id: text("id").primaryKey(),
    couponId: text("coupon_id")
      .notNull()
      .references(() => adminCoupon.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    activatedAt: timestamp("activated_at").notNull().defaultNow(),
    activatedByUserId: text("activated_by_user_id"),
  },
  (t) => [
    index("admin_coupon_redemption_coupon_idx").on(t.couponId),
    index("admin_coupon_redemption_org_idx").on(t.organizationId),
  ],
);