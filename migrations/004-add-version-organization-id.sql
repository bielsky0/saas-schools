-- Migration: 004-add-version-organization-id
-- Adds version_organization_id to _pages_v because organizationId is now a
-- declared Payload field (added in this session). Payload mirrors declared
-- fields into _v tables with a version_ prefix. Without this column, the
-- admin list view for Pages crashes with "column _pages_v.version_organization_id
-- does not exist" when Payload applies access control filters.
--
-- Run via: DATABASE_MIGRATION_URL=... psql or
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate < migrations/004-add-version-organization-id.sql

ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_organization_id" TEXT;
