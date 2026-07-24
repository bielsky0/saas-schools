import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const notificationEventType = pgTable("notification_event_type", {
  code: text("code").primaryKey(),
  defaultChannels: text("default_channels").array().notNull().default(["email", "in_app"]),
  isOverridable: boolean("is_overridable").notNull().default(true),
});
