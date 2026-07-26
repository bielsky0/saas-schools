--> HAND-WRITTEN (Faza 30a — CMS: RLS na tabelach Payloada + tenant_block_access).
-->
--> Row-Level Security na tabelach Payload CMS (pages, media, theme) oraz na
--> ręcznej tabeli tenant_block_access. Wzorzec identyczny jak 0015–0017:
--> FORCE RLS + polityka tenant_isolation (app.organization_id) + polityka
--> system_bypass (app.bypass_rls).
-->
--> Pages, media, theme są tworzone przez Payload + afterSchemaInit.
--> tenant_block_access jest tworzony przez beforeSchemaInit w payload-config.ts.
-->
--> Kolumny organization_id są dodawane przez afterSchemaInit i są NOT NULL
--> z DEFAULT ''.
-->
--> RLS policy split: FOR SELECT jest permissive (USING true) — read ops nie mają
--> transakcji w Payloadzie (A0c-ext: findByID/find = ABSENT), więc GUC
--> app.organization_id nigdy nie jest ustawiony dla SELECT. RLS chroni wyłącznie
--> zapisy, odczyty wyłącznie przez access.read + ESLint fence. To świadoma decyzja architektoniczna, a nie przeoczenie.
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint

--> ── pages ────────────────────────────────────────────────────────────
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pages_tenant_isolation" ON "pages"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint
CREATE POLICY "pages_tenant_isolation_insert" ON "pages"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "pages_tenant_isolation_update" ON "pages"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "pages_tenant_isolation_delete" ON "pages"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "pages_system_bypass" ON "pages"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--> ── media ────────────────────────────────────────────────────────────
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "media_tenant_isolation" ON "media"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint
CREATE POLICY "media_tenant_isolation_insert" ON "media"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "media_tenant_isolation_update" ON "media"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "media_tenant_isolation_delete" ON "media"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "media_system_bypass" ON "media"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--> ── theme ────────────────────────────────────────────────────────────
ALTER TABLE "theme" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "theme" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "theme_tenant_isolation" ON "theme"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint
CREATE POLICY "theme_tenant_isolation_insert" ON "theme"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "theme_tenant_isolation_update" ON "theme"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "theme_tenant_isolation_delete" ON "theme"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "theme_system_bypass" ON "theme"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--> ── tenant_block_access ──────────────────────────────────────────────
ALTER TABLE "tenant_block_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_block_access" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_block_access_tenant_isolation" ON "tenant_block_access"
  FOR SELECT TO saas_school USING (true);--> statement-breakpoint
CREATE POLICY "tenant_block_access_tenant_isolation_insert" ON "tenant_block_access"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "tenant_block_access_tenant_isolation_update" ON "tenant_block_access"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "tenant_block_access_tenant_isolation_delete" ON "tenant_block_access"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "tenant_block_access_system_bypass" ON "tenant_block_access"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
