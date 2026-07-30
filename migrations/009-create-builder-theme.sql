-- Migration: 009-create-builder-theme
-- Separate storage for ChaiBuilder theme per organization (tenant).
-- Decoupled from Payload CMS `theme` table (which serves apex.pl static pages).
--
-- The partial unique index on (organization_id, is_active) WHERE is_active = true
-- guarantees at most one active theme per organization.
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate \
--     < migrations/009-create-builder-theme.sql

CREATE TABLE IF NOT EXISTS "builder_theme" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" text NOT NULL,
    "theme" jsonb NOT NULL DEFAULT '{}',
    "is_active" boolean NOT NULL DEFAULT false,
    "version" integer NOT NULL DEFAULT 1,
    "created_by" text,
    "updated_by" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "builder_theme_org_active_idx"
    ON "builder_theme" ("organization_id", "is_active")
    WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "builder_theme_org_idx"
    ON "builder_theme" ("organization_id");
