import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./organizations";

export const organizationSmsCredit = pgTable("organization_sms_credit", {
  organizationId: text("organizationId")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
