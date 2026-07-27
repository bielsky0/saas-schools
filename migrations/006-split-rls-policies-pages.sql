-- Migration: 006-split-rls-policies
-- Replace the old FOR ALL policies (from 002-enable-rls-payload-tables)
-- with per-command split policies matching 0060_faza30a_cms_tables.sql pattern:
--   SELECT: USING (true) — reads have no transaction scope in Payload
--   INSERT/UPDATE/DELETE: reference organization_id + app.organization_id GUC
--   system_bypass: WITH CHECK added for consistency
--
-- Old policies blocked ALL operations when app.organization_id GUC was not set
-- (empty → NULLIF → NULL → FALSE). Since the GUC is only set during writes
-- (via beforeOperation hook in tenant-context.ts), reads were impossible.
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate < migrations/006-split-rls-policies.sql

BEGIN;

-- ── pages ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pages_tenant_isolation" ON "pages";

CREATE POLICY "pages_tenant_isolation_select" ON "pages"
  FOR SELECT TO saas_school USING (true);

CREATE POLICY "pages_tenant_isolation_insert" ON "pages"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "pages_tenant_isolation_update" ON "pages"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "pages_tenant_isolation_delete" ON "pages"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

-- Update system_bypass WITH CHECK for consistency
DROP POLICY IF EXISTS "pages_system_bypass" ON "pages";

CREATE POLICY "pages_system_bypass" ON "pages"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');

-- ── media ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "media_tenant_isolation" ON "media";

CREATE POLICY "media_tenant_isolation_select" ON "media"
  FOR SELECT TO saas_school USING (true);

CREATE POLICY "media_tenant_isolation_insert" ON "media"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "media_tenant_isolation_update" ON "media"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "media_tenant_isolation_delete" ON "media"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

DROP POLICY IF EXISTS "media_system_bypass" ON "media";

CREATE POLICY "media_system_bypass" ON "media"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');

-- ── theme ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "theme_tenant_isolation" ON "theme";

CREATE POLICY "theme_tenant_isolation_select" ON "theme"
  FOR SELECT TO saas_school USING (true);

CREATE POLICY "theme_tenant_isolation_insert" ON "theme"
  FOR INSERT TO saas_school
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "theme_tenant_isolation_update" ON "theme"
  FOR UPDATE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "theme_tenant_isolation_delete" ON "theme"
  FOR DELETE TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''));

DROP POLICY IF EXISTS "theme_system_bypass" ON "theme";

CREATE POLICY "theme_system_bypass" ON "theme"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');

COMMIT;
