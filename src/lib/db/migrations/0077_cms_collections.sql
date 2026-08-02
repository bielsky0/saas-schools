-- HAND-WRITTEN (blog-templates-cms, Faza 2.5 — CMS collection management).
--
-- Creates the `cms_collection` table (Drizzle-managed schema, matching
-- src/lib/db/schema/cms-collections.ts exactly) and seeds the default
-- collections ("blog", "courses") into every existing organization. The
-- hardcoded CMS_COLLECTIONS config from src/lib/cms-collections.ts is fully
-- replaced by this table — the static array survives only as the seed below
-- and as the seed for new organizations (createOrganization).
--
-- Column naming is camelCase ("organizationId"), matching the `page` table.
-- RLS follows the same split-policy pattern as 0069_faza38_page_table.sql:
--   SELECT: USING (true) — permissive, isolation enforced at application layer
--   INSERT/UPDATE/DELETE: gated by app.organization_id GUC
--   system_bypass: coalesce(app.bypass_rls) = 'on'
--
-- No `updated_at` trigger: this repo has no update_updated_at_column()
-- function, and the Drizzle schema carries `$onUpdate(() => new Date())`,
-- which is how every other table in the repo touches `updatedAt`.

BEGIN;--> statement-breakpoint

-- ── Table ──────────────────────────────────────────────────────────────

CREATE TABLE "cms_collection" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "pageType" text NOT NULL,
  "templatePageType" text NOT NULL,
  "templates" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

-- ── Foreign keys ───────────────────────────────────────────────────────

ALTER TABLE "cms_collection" ADD CONSTRAINT "cms_collection_organizationId_organization_id_fk"
  FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ── Indexes ────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "cms_collection_org_key_idx"
  ON "cms_collection" USING btree ("organizationId","key");--> statement-breakpoint

CREATE UNIQUE INDEX "cms_collection_org_page_type_idx"
  ON "cms_collection" USING btree ("organizationId","pageType");--> statement-breakpoint

CREATE INDEX "cms_collection_org_idx"
  ON "cms_collection" USING btree ("organizationId");--> statement-breakpoint

-- ── Seed existing tenants ──────────────────────────────────────────────

-- Copied from the old CMS_COLLECTIONS config. Runs before RLS is enabled so
-- the migration connection (owner) is not subject to the tenant GUC policy.
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organization LOOP
    INSERT INTO cms_collection ("id", "organizationId", "key", "name", "pageType", "templatePageType", "templates", "position")
    VALUES
      (gen_random_uuid(), org.id, 'blog', 'Wpis na blogu', 'blog_post', 'blog_post_template',
       '[{"id":"tpl-blog-classic","name":"Klasyczny Artykuł","collectionId":"blog","layout":"single"},{"id":"tpl-blog-interview","name":"Wywiad / Case Study","collectionId":"blog","layout":"sidebar"}]'::jsonb,
       0),
      (gen_random_uuid(), org.id, 'courses', 'Kursy / Nauczyciele', 'course_entry', 'course_template',
       '[{"id":"tpl-course-default","name":"Domyślny","collectionId":"courses","layout":"single"}]'::jsonb,
       1);
  END LOOP;
END $$;--> statement-breakpoint

-- ── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE "cms_collection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_collection" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "cms_collection_tenant_isolation_select" ON "cms_collection"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint

CREATE POLICY "cms_collection_tenant_isolation_insert" ON "cms_collection"
  FOR INSERT TO saas_school
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "cms_collection_tenant_isolation_update" ON "cms_collection"
  FOR UPDATE TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "cms_collection_tenant_isolation_delete" ON "cms_collection"
  FOR DELETE TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "cms_collection_system_bypass" ON "cms_collection"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

COMMIT;
