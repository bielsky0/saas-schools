import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organization } from "./organizations";

/**
 * A per-organization override of an org setting key that does NOT map to an
 * `organization` column. Stored as a diff against the default the client would
 * otherwise have: `valueJson` is the effective value, `defaultValueJson` is a
 * snapshot of what it replaced, so the admin console can render a diff and a
 * one-click reset.
 *
 * GLOBAL / bypass-only (the row is cross-tenant by design — the Super Admin
 * writes it on behalf of one organization).
 */
export const adminClientSettingOverride = pgTable(
  "admin_client_setting_override",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    settingKey: text("setting_key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    defaultValueJson: jsonb("default_value_json").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("admin_client_setting_override_org_key_uq").on(t.organizationId, t.settingKey),
    index("admin_client_setting_override_org_idx").on(t.organizationId),
  ],
);