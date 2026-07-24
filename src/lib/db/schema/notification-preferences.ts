import { boolean, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { notificationEventType } from "./notification-event-types";

export const notificationPreference = pgTable(
  "notification_preference",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<string>().notNull(),
    inAppEnabled: boolean("inAppEnabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),

    recipientType: text("recipient_type").notNull().default("staff"),
    recipientId: text("recipient_id")
      .notNull()
      .default(sql`''`),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    eventType: text("event_type").references(() => notificationEventType.code, {
      onDelete: "set null",
    }),
  },
  (t) => [
    unique("notification_preference_user_type_uq").on(t.userId, t.type),
    index("notification_preference_user_idx").on(t.userId),
  ],
);
