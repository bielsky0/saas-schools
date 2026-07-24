import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { organization } from "./organizations";
import { personalAccount } from "./personal-accounts";
import { notificationEventType } from "./notification-event-types";

export const notification = pgTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organizationId").references(() => organization.id, {
      onDelete: "cascade",
    }),
    accountId: text("accountId").references(() => personalAccount.id, { onDelete: "cascade" }),
    type: text("type").$type<string>().notNull(),
    params: jsonb("params").$type<Record<string, string | number>>().notNull().default({}),
    link: text("link"),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),

    recipientType: text("recipient_type").notNull().default("staff"),
    recipientId: text("recipient_id")
      .notNull()
      .default(sql`''`),
    eventType: text("event_type").references(() => notificationEventType.code, {
      onDelete: "set null",
    }),
    content: text("content"),
    channelSent: text("channel_sent").array(),
  },
  (t) => [
    index("notification_user_org_idx").on(t.userId, t.organizationId),
    index("notification_user_account_idx").on(t.userId, t.accountId),
    index("notification_recipient_idx").on(t.recipientType, t.recipientId),
    check("notification_owner_ck", sql`(${t.organizationId} IS NULL) <> (${t.accountId} IS NULL)`),
  ],
);
