-- Migration: 003-disable-rls-payload-admin-users
-- Disables RLS on payload_admin_users because it has no organization_id
-- column (non-tenant table). The only policy was system_bypass, which
-- required app.bypass_rls = 'on' to be set on every operation — but the
-- auth strategy's upsert (via payload.db) doesn't set that flag, so every
-- login was blocked by RLS. RLS on a table without an isolation column
-- provides zero security benefit.
--
-- Run via: docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate < migrations/003-disable-rls-payload-admin-users.sql
--
-- NOTE: This is also applied automatically by afterSchemaInit in
-- src/features/cms/payload-config.ts for fresh databases.

DROP POLICY IF EXISTS payload_admin_users_system_bypass ON payload_admin_users;
ALTER TABLE payload_admin_users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE payload_admin_users DISABLE ROW LEVEL SECURITY;
