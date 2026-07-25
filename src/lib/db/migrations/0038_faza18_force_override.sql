--> HAND-WRITTEN (langlion plan Faza 18, EPIK 14.5).
-->
--> 1. Add `force_override` boolean column to `class_session` (default false).
-->    Marks a session where a trainer conflict was deliberately overridden.
-->
--> 2. Recreate the §5.1 EXCLUDE constraint so its WHERE clause exempts rows
-->    where force_override is true. Without this, the constraint fires before
-->    the app has a chance to say "this one is deliberate".
-->
--> The column IS visible to drizzle-kit (unlike hand-written EXCLUDE
--> constraints — Drizzle has no representation for EXCLUDE). Regeneration
--> via `drizzle-kit generate` will see the column but will NOT see the
--> modified WHERE clause of the EXCLUDE constraint; the constraint must be
--> preserved by hand, same as its original in 0014_lively_sumo.sql.
--> statement-breakpoint
ALTER TABLE "class_session" ADD COLUMN "force_override" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "class_session" DROP CONSTRAINT IF EXISTS "class_session_trainer_no_overlap_excl";--> statement-breakpoint
ALTER TABLE "class_session" ADD CONSTRAINT "class_session_trainer_no_overlap_excl"
  EXCLUDE USING gist (
    "trainerId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled' AND "force_override" IS NOT TRUE);
