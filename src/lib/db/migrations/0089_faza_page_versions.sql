-- HAND-WRITTEN (Faza 0+1 apex dashboard — page versions, 0.8).
--
-- `page_version` — CMS snapshot per page. Tenant isolation is NOT via an
-- `organization_id` column but through a subquery against the parent `page`
-- (wzorzec 0069): a row is visible to a tenant only when its `page_id` belongs
-- to that tenant (`page."organizationId"` = GUC). The bypass policy reopens all
-- rows for Super Admin via withSystemBypass. Column naming matches the page
-- table convention (camelCase `organizationId` inside the quoted subquery).

BEGIN;--> statement-breakpoint

CREATE TABLE "page_version" (
  "id" text PRIMARY KEY NOT NULL,
  "page_id" text NOT NULL REFERENCES "public"."page"("id") ON DELETE cascade,
  "blocks_json" jsonb NOT NULL,
  "seo_json" jsonb,
  "title" text NOT NULL,
  "status_snapshot" text NOT NULL,
  "created_by_user_id" text NOT NULL REFERENCES "public"."user"("id"),
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "page_version" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "page_version" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "page_version_tenant_isolation" ON "page_version"
  FOR ALL TO saas_school
  USING ("page_id" IN (
    SELECT "id" FROM "page"
    WHERE "organizationId" = nullif(current_setting('app.organization_id', true), '')
  ))
  WITH CHECK ("page_id" IN (
    SELECT "id" FROM "page"
    WHERE "organizationId" = nullif(current_setting('app.organization_id', true), '')
  ));--> statement-breakpoint
CREATE POLICY "page_version_system_bypass" ON "page_version"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "page_version_page_created_idx" ON "page_version" USING btree ("page_id", "created_at");--> statement-breakpoint

COMMIT;