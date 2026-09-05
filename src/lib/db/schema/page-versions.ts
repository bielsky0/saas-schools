import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { page } from "./pages";
import { user } from "./auth";

/**
 * A snapshot of a CMS page at one point in time — the versioning backbone for
 * the Apex admin console (publish / rollback / timeline). `blocksJson` holds the
 * ChaiBuilder payload, `statusSnapshot` the page status at snapshot time.
 *
 * Tenant-scoped through the PARENT page (`page.organizationId`): RLS in
 * migration 0089 isolates rows by a subquery against `page`, so a tenant can
 * only ever see its own pages' versions.
 */
export const pageVersion = pgTable(
  "page_version",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => page.id, { onDelete: "cascade" }),
    blocksJson: jsonb("blocks_json").notNull(),
    seoJson: jsonb("seo_json"),
    title: text("title").notNull(),
    statusSnapshot: text("status_snapshot").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("page_version_page_created_idx").on(t.pageId, t.createdAt)],
);