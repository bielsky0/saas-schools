import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A `condition` on a feature flag — an optional gate that flips the flag on
 * once a tenant's resource metric reaches a threshold. Example:
 * `{ metric: 'members', gte: 1000 }`. NULL = unconditional.
 */
export type FeatureFlagCondition = {
  metric: string;
  gte: number;
};

/**
 * Feature flag dictionary — the registry of every feature a tenant can be
 * toggled on/off on. `enabledGlobal` is the base (fail-closed) layer; exact
 * overrides come from `admin_feature_flag_value` (per group / per org).
 *
 * GLOBAL table. Writes bypass-only; reads only from cross-tenant flag engine.
 */
export const adminFeatureFlag = pgTable(
  "admin_feature_flag",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
    description: text("description"),
    enabledGlobal: boolean("enabled_global").notNull().default(false),
    condition: jsonb("condition").$type<FeatureFlagCondition>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("admin_feature_flag_key_idx").on(t.key)],
);

/**
 * A single override of a feature flag for one scope. Absence of a row means
 * "inherit" — the effective enabled state walks org → group → global.
 * `scope` is 'group' | 'organization'; `scopeId` is the group or org id.
 *
 * GLOBAL / bypass-only, like the dictionary.
 */
export const adminFeatureFlagValue = pgTable(
  "admin_feature_flag_value",
  {
    id: text("id").primaryKey(),
    featureKey: text("feature_key")
      .notNull()
      .references(() => adminFeatureFlag.key, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    scopeId: text("scope_id").notNull(),
    enabled: boolean("enabled").notNull(),
  },
  (t) => [
    index("admin_feature_flag_value_feature_idx").on(t.featureKey),
    index("admin_feature_flag_value_scope_idx").on(t.scope, t.scopeId),
  ],
);
