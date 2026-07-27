-- Migration: 002-enable-rls-payload-tables
-- Enables Row Level Security on Payload CMS tables + creates tenant isolation
-- and system bypass policies, matching the pattern from Faza 30a.
--
-- Run via: docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate < migrations/002-enable-rls-payload-tables.sql

BEGIN;

-- Add organization_id to _pages_v (versions table) for consistent RLS scoping
ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "organization_id" text NOT NULL DEFAULT '';

-- ============================================================
-- Enable RLS + create policies for tenant-scoped tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['pages', '_pages_v', 'media', 'theme'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Tenant isolation policy: rows belong to the organization set in app.organization_id
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO saas_school USING (
        organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')
      )',
      tbl || '_tenant_isolation', tbl
    );

    -- System bypass policy: saas_school can bypass RLS when app.bypass_rls = 'on'
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO saas_school USING (
        COALESCE(current_setting(''app.bypass_rls'', true), '''') = ''on''
      )',
      tbl || '_system_bypass', tbl
    );
  END LOOP;
END $$;

-- payload_admin_users is NOT tenant-scoped (no organization_id column).
-- It only gets system_bypass policy for admin operations.
ALTER TABLE payload_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payload_admin_users FORCE ROW LEVEL SECURITY;

CREATE POLICY payload_admin_users_system_bypass ON payload_admin_users
  FOR ALL TO saas_school
  USING (
    COALESCE(current_setting('app.bypass_rls', true), '') = 'on'
  );

-- Verify
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('pages', '_pages_v', 'media', 'theme', 'payload_admin_users');

COMMIT;
