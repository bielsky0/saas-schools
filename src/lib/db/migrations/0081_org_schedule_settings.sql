-- HAND-WRITTEN (mvp-plan F4 — Schedule Builder org settings).
--
-- Adds three columns to `organization` for the Schedule Builder grid configuration:
--   schedule_start_hour   — first hour shown in the grid (0-23), default 6 (06:00)
--   schedule_end_hour     — last hour shown in the grid (0-23), default 22 (22:00)
--   schedule_slot_minutes — slot granularity in minutes (15, 30, 60), default 30

BEGIN;--> statement-breakpoint

ALTER TABLE "organization"
  ADD COLUMN "schedule_start_hour" integer NOT NULL DEFAULT 6,--> statement-breakpoint
  ADD COLUMN "schedule_end_hour" integer NOT NULL DEFAULT 22,--> statement-breakpoint
  ADD COLUMN "schedule_slot_minutes" integer NOT NULL DEFAULT 30;--> statement-breakpoint

-- Optional: add CHECK constraints to keep values sane
ALTER TABLE "organization"
  ADD CONSTRAINT "organization_schedule_start_hour_chk"
    CHECK ("schedule_start_hour" >= 0 AND "schedule_start_hour" <= 23),--> statement-breakpoint
  ADD CONSTRAINT "organization_schedule_end_hour_chk"
    CHECK ("schedule_end_hour" >= 0 AND "schedule_end_hour" <= 23),--> statement-breakpoint
  ADD CONSTRAINT "organization_schedule_slot_minutes_chk"
    CHECK ("schedule_slot_minutes" IN (15, 30, 60));--> statement-breakpoint

COMMIT;