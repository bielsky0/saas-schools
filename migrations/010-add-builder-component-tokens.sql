-- Migration: 010-add-builder-component-tokens
-- Component theme tokens (`--cmp-*` CSS vars) per organization, co-located with
-- the active ChaiBuilder theme row (Phase 3 §4.2). Stored OUT of `ChaiTheme`
-- (no ChaiTheme shape change, no theme CSS var regressions).
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate \
--     < migrations/010-add-builder-component-tokens.sql

ALTER TABLE "builder_theme"
    ADD COLUMN IF NOT EXISTS "component_tokens" jsonb NOT NULL DEFAULT '{}';
