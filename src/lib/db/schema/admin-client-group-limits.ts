import { index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { adminClientGroup } from "./admin-client-groups";

/**
 * Group limit overrides — numeric cap overrides scoped to client groups.
 *
 * GLOBAL table (like admin_feature_flag_value). One row per (group, limit_key).
 * `limit_value` NULL = unlimited (explicit, matching
 * `organization_limit_override` convention).
 *
 * Resolution priority in `getEffectiveLimit`: org override → group override
 * (highest value among org's groups wins; NULL=unlimited trumps) → plan →
 * fail-closed (0). Group override read via withSystemBypass only (no
 * permissive SELECT, same as every admin_client_* table).
 */
export const adminClientGroupLimitValue = pgTable(
  "admin_client_group_limit_value",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => adminClientGroup.id, { onDelete: "cascade" }),
    limitKey: text("limit_key").notNull(),
    limitValue: integer("limit_value"), // NULL = unlimited
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("admin_client_group_limit_value_group_key_uq").on(t.groupId, t.limitKey),
    index("admin_client_group_limit_value_group_idx").on(t.groupId),
  ],
);
