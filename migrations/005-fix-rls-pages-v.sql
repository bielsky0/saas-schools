-- Migration: 005-fix-rls-pages-v
-- Fix RLS policies on _pages_v to reference version_organization_id instead
-- of organization_id. Originally the policies referenced organization_id (a
-- raw SQL column added by afterSchemaInit), but now that organizationId is a
-- declared Payload field, Payload stores version data in version_organization_id
-- (with version_ prefix). The old policies blocked all writes because
-- organization_id was always '' (NOT NULL DEFAULT '').
--
-- Also add WITH CHECK clauses matching the split-policy pattern from
-- 0060_faza30a_cms_tables.sql (FOR INSERT/UPDATE with WITH CHECK,
-- FOR SELECT with USING (true) since reads have no transaction scope).
--
-- Only _pages_v needs fixing — media and theme don't have versions enabled.
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate < migrations/005-fix-rls-pages-v.sql

BEGIN;

-- Drop the old FOR ALL policy that referenced organization_id
DROP POLICY IF EXISTS "_pages_v_tenant_isolation" ON "_pages_v";

-- Recreate with split policies matching the pattern from pages:
--   SELECT: USING (true) — reads have no transaction scope in Payload
--   INSERT/UPDATE/DELETE: reference version_organization_id
--   WITH CHECK for insert/update to validate the written value

CREATE POLICY "_pages_v_tenant_isolation_select" ON "_pages_v"
  FOR SELECT TO saas_school
  USING (true);

CREATE POLICY "_pages_v_tenant_isolation_insert" ON "_pages_v"
  FOR INSERT TO saas_school
  WITH CHECK ("version_organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "_pages_v_tenant_isolation_update" ON "_pages_v"
  FOR UPDATE TO saas_school
  USING ("version_organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("version_organization_id" = nullif(current_setting('app.organization_id', true), ''));

CREATE POLICY "_pages_v_tenant_isolation_delete" ON "_pages_v"
  FOR DELETE TO saas_school
  USING ("version_organization_id" = nullif(current_setting('app.organization_id', true), ''));

-- system_bypass stays unchanged (doesn't reference any column)
-- but recreate it to be explicit and match the pattern
DROP POLICY IF EXISTS "_pages_v_system_bypass" ON "_pages_v";

CREATE POLICY "_pages_v_system_bypass" ON "_pages_v"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');

COMMIT;
