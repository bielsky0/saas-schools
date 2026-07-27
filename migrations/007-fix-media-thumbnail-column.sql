-- Migration: 007-fix-media-thumbnail-column
-- Rename thumbnail_url → thumbnail_u_r_l to match Payload's Drizzle column
-- naming convention (to-snake-case). Payload's Drizzle adapter converts the
-- upload base field "thumbnailURL" to "thumbnail_u_r_l" via the to-snake-case
-- npm package. The table was created with "thumbnail_url" instead, causing:
--   column "thumbnail_u_r_l" does not exist
-- when accessing the Media collection in Payload admin.
--
-- Run via:
--   docker exec -i saas_school_postgres psql -U postgres -d saas_boilerplate \
--     < migrations/007-fix-media-thumbnail-column.sql

ALTER TABLE "media" RENAME COLUMN "thumbnail_url" TO "thumbnail_u_r_l";
