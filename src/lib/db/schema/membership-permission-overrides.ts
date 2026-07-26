import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { membership } from "./memberships";
import { organization } from "./organizations";

/**
 * Granular permission overrides per membership (Faza 23, EPIK 38, §2.36).
 *
 * An overlay on top of the static ROLE_PERMISSIONS map: grant a permission the
 * base role does not include, or revoke one it does. The static map stays the
 * single source of truth for every role's default set; these rows add or remove
 * individual permissions, and computeEffectivePermissions in features/rbac
 * resolves the effective set.
 *
 * Owner memberships are immune to overrides (defense-in-depth enforced at the
 * data layer AND in computeEffectivePermissions). The permission
 * member_permissions.manage is excluded from the overridable pool
 * (hardcoded at both layers) to close the escalation vector where an Admin
 * grants a lower role the authority to manage its own overrides.
 *
 * One override per (membership, permissionKey) — a grant and revoke for the
 * same key would be self-cancelling.
 */
export const membershipPermissionOverride = pgTable(
  "membership_permission_override",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    membershipId: text("membershipId")
      .notNull()
      .references(() => membership.id, { onDelete: "cascade" }),
    permissionKey: text("permissionKey").notNull(),
    overrideType: text("overrideType").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("mpo_membership_key_uq").on(t.membershipId, t.permissionKey),
    index("mpo_membership_idx").on(t.membershipId),
    index("mpo_org_idx").on(t.organizationId),
  ],
);
