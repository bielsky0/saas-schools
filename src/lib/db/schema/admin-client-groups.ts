import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organization } from "./organizations";
import { user } from "./auth";

/**
 * Client groups — cross-tenant grouping of organizations, used as the common
 * dimension for feature flags (admin_feature_flag_value with scope='group'),
 * numeric limits (admin_client_group_limit_value, Faza 5) and coupons
 * (admin_coupon with scope='group').
 *
 * GLOBAL table (no owned tenant). Writes are bypass-only (Super Admin via
 * withSystemBypass / RLS `app.bypass_rls`); reads happen exclusively in
 * cross-tenant admin modules. Fail-closed: without the bypass GUC a row is
 * invisible (migration 0085 enforces this by having no permissive policy).
 */
export const adminClientGroup = pgTable(
  "admin_client_group",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("admin_client_group_slug_idx").on(t.slug)],
);

/**
 * Group membership — which organization belongs to which client group.
 * `organization_id` is a BUSINESS key (whose group is it), not the RLS owner:
 * the row is cross-tenant and, like every row in this module, only reachable
 * through the system bypass.
 */
export const adminClientGroupMember = pgTable(
  "admin_client_group_member",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => adminClientGroup.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("admin_client_group_member_group_org_uq").on(t.groupId, t.organizationId),
    index("admin_client_group_member_org_idx").on(t.organizationId),
  ],
);
