import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./organizations";
import { user } from "./auth";

export const broadcastMessage = pgTable("broadcast_message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  channel: text("channel", { enum: ["sms", "email"] }).notNull(),
  audienceType: text("audience_type", {
    enum: ["group_type", "session", "all_clients"],
  }).notNull(),
  audienceRefId: text("audience_ref_id"),
  body: text("body").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  status: text("status", { enum: ["pending", "sent"] })
    .notNull()
    .default("pending"),
  sentByUserId: text("sent_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});
