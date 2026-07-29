-- HAND-WRITTEN (Faza 38 — CMS page table + RLS for ChaiBuilder editor).
--
-- Creates the `page` table (Drizzle-managed schema) for the visual editor
-- at /editor, and enables Row-Level Security with the same split-policy
-- pattern as 0060_faza30a_cms_tables.sql:
--   SELECT: USING (true) — permissive, isolation enforced at application layer
--   INSERT/UPDATE/DELETE: gated by app.organization_id GUC
--   system_bypass: coalesce(app.bypass_rls) = 'on'
--
-- The table definition matches src/lib/db/schema/pages.ts exactly.
-- Column naming is camelCase ("organizationId") — the GUC name is
-- snake_case ("app.organization_id"), matching every other RLS policy
-- in this repo.

BEGIN;--> statement-breakpoint

-- ── Table ──────────────────────────────────────────────────────────────

CREATE TABLE "page" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "seo" jsonb,
  "status" text DEFAULT 'draft' NOT NULL,
  "pageType" text DEFAULT 'page' NOT NULL,
  "parentId" text,
  "isHome" boolean DEFAULT false NOT NULL,
  "createdByUserId" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "publishedAt" timestamp,
  "publishedByUserId" text,
  CONSTRAINT "page_org_slug_uq" UNIQUE("organizationId","slug")
);--> statement-breakpoint

-- ── Foreign keys ───────────────────────────────────────────────────────

ALTER TABLE "page" ADD CONSTRAINT "page_organizationId_organization_id_fk"
  FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "page" ADD CONSTRAINT "page_parentId_page_id_fk"
  FOREIGN KEY ("parentId") REFERENCES "public"."page"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "page" ADD CONSTRAINT "page_createdByUserId_user_id_fk"
  FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "page" ADD CONSTRAINT "page_publishedByUserId_user_id_fk"
  FOREIGN KEY ("publishedByUserId") REFERENCES "public"."user"("id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ── Indexes ────────────────────────────────────────────────────────────

CREATE INDEX "page_org_slug_idx" ON "page" USING btree ("organizationId","slug");--> statement-breakpoint
CREATE INDEX "page_status_idx" ON "page" USING btree ("status");--> statement-breakpoint

-- ── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE "page" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "page" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "page_tenant_isolation_select" ON "page"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint

CREATE POLICY "page_tenant_isolation_insert" ON "page"
  FOR INSERT TO saas_school
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "page_tenant_isolation_update" ON "page"
  FOR UPDATE TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "page_tenant_isolation_delete" ON "page"
  FOR DELETE TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "page_system_bypass" ON "page"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

COMMIT;
