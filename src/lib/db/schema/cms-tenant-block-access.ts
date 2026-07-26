import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "./organizations";
import { user } from "./auth";

export const tenantBlockAccess = pgTable(
  "tenant_block_access",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    blockKey: text("block_key").notNull(),
    grantedByUserId: text("granted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_block_access_org_block_uq").on(table.organizationId, table.blockKey),
  ],
);
