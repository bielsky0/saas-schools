-- Migration: 008-add-theme-border-radius
-- Adds border_radius column to the theme table for ChaiBuilder theme config.
-- The public page uses this value to set --radius in CSS variables.
-- Default: 0.5rem (chosen over Payload/s entryless default for older tenants)
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate \
--     < migrations/008-add-theme-border-radius.sql

ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "border_radius" TEXT NOT NULL DEFAULT '0.5rem';
