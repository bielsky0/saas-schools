-- Migration: 001-create-payload-tables
-- Creates Payload CMS tables for collections: pages, media, theme, users
-- Run via: psql $DATABASE_MIGRATION_URL -f migrations/001-create-payload-tables.sql

BEGIN;

-- ============================================================
-- Enum types
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "enum_pages_status" AS ENUM('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "enum__pages_v_version_status" AS ENUM('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1. pages (slug: "pages", versions.drafts: true)
-- ============================================================
CREATE TABLE IF NOT EXISTS "pages" (
    "id" serial PRIMARY KEY,
    "title" varchar,
    "slug" varchar,
    "status" "enum_pages_status" DEFAULT 'draft',
    "blocks" jsonb,
    "seo_description" varchar,
    "_status" "enum_pages_status" DEFAULT 'draft',
    "organization_id" text NOT NULL DEFAULT '',
    "created_by_user_id" text,
    "updated_by_user_id" text,
    "deleted_at" timestamptz,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pages_slug_idx" ON "pages" ("slug");
CREATE INDEX IF NOT EXISTS "pages__status_idx" ON "pages" ("_status");
CREATE INDEX IF NOT EXISTS "pages_created_at_idx" ON "pages" ("created_at");
CREATE INDEX IF NOT EXISTS "pages_updated_at_idx" ON "pages" ("updated_at");

-- ============================================================
-- 1b. _pages_v (versions table for pages drafts)
-- ============================================================
CREATE TABLE IF NOT EXISTS "_pages_v" (
    "id" serial PRIMARY KEY,
    "parent_id" integer REFERENCES "pages"("id") ON DELETE SET NULL,
    "version_title" varchar,
    "version_slug" varchar,
    "version_status" "enum__pages_v_version_status" DEFAULT 'draft',
    "version_blocks" jsonb,
    "version_seo_description" varchar,
    "version__status" "enum__pages_v_version_status" DEFAULT 'draft',
    "version_created_at" timestamp(3) with time zone,
    "version_updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
);

CREATE INDEX IF NOT EXISTS "_pages_v_parent_id_idx" ON "_pages_v" ("parent_id");
CREATE INDEX IF NOT EXISTS "_pages_v_latest_idx" ON "_pages_v" ("latest");
CREATE INDEX IF NOT EXISTS "_pages_v_created_at_idx" ON "_pages_v" ("created_at");
CREATE INDEX IF NOT EXISTS "_pages_v_updated_at_idx" ON "_pages_v" ("updated_at");
CREATE INDEX IF NOT EXISTS "_pages_v_version_slug_idx" ON "_pages_v" ("version_slug");
CREATE INDEX IF NOT EXISTS "_pages_v_version__status_idx" ON "_pages_v" ("version__status");
CREATE INDEX IF NOT EXISTS "_pages_v_version_created_at_idx" ON "_pages_v" ("version_created_at");
CREATE INDEX IF NOT EXISTS "_pages_v_version_updated_at_idx" ON "_pages_v" ("version_updated_at");

-- ============================================================
-- 2. media (slug: "media", upload: true)
-- ============================================================
CREATE TABLE IF NOT EXISTS "media" (
    "id" serial PRIMARY KEY,
    "alt_text" varchar,
    "file_id" varchar NOT NULL,
    "url" varchar,
    "thumbnail_url" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric,
    "organization_id" text NOT NULL DEFAULT '',
    "created_by_user_id" text,
    "deleted_at" timestamptz,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" ("filename");
CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" ("created_at");
CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" ("updated_at");

-- ============================================================
-- 3. theme (slug: "theme")
-- ============================================================
CREATE TABLE IF NOT EXISTS "theme" (
    "id" serial PRIMARY KEY,
    "font_primary" varchar NOT NULL,
    "font_heading" varchar NOT NULL,
    "color_primary" varchar NOT NULL,
    "color_secondary" varchar NOT NULL,
    "organization_id" text NOT NULL DEFAULT '',
    "created_by_user_id" text,
    "updated_by_user_id" text,
    "deleted_at" timestamptz,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "theme_created_at_idx" ON "theme" ("created_at");
CREATE INDEX IF NOT EXISTS "theme_updated_at_idx" ON "theme" ("updated_at");

-- ============================================================
-- 4. payload_admin_users (slug: "users", dbName: "payload_admin_users")
-- ============================================================
CREATE TABLE IF NOT EXISTS "payload_admin_users" (
    "id" serial PRIMARY KEY,
    "email" varchar NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "payload_admin_users_email_idx" ON "payload_admin_users" ("email");
CREATE INDEX IF NOT EXISTS "payload_admin_users_created_at_idx" ON "payload_admin_users" ("created_at");
CREATE INDEX IF NOT EXISTS "payload_admin_users_updated_at_idx" ON "payload_admin_users" ("updated_at");

-- ============================================================
-- Verify
-- ============================================================
COMMIT;

-- Verification (run separately after COMMIT):
-- SELECT tablename FROM pg_catalog.pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('pages', '_pages_v', 'media', 'theme', 'payload_admin_users')
-- ORDER BY 1;
