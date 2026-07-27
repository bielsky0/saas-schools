import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./organizations";

/**
 * Contact form submissions from public CMS pages.
 *
 * Przechowywane wyłącznie do celów antyspamowych (rate-limit + forensic),
 * nie jako dowód zgody ani akceptacji. Retention 12m.
 */
export const contactFormSubmission = pgTable("contact_form_submission", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  pageId: text("page_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  honeypotFilled: boolean("honeypot_filled").notNull().default(false),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
