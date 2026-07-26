--> HAND-WRITTEN (langlion plan Faza 22, EPIK 36, EPIK 40, §2.34, §2.39, spec v17).
-->
--> `interest_signup` — lightweight interest record (no session, no booking, no
--> credit, no payment). Unique per (group_type, athlete) for idempotency
--> (Constraint 13). Admin converts to a real booking through `createBooking`
--> with full §5 protection (Rozstrzygnięcie #25).
-->
--> Composite FKs follow the repo standard (athlete, client, group_type, booking
--> all carry organizationId). See e.g. bookings.ts for the pattern.
-->
--> `group_type.status` — additive column defaulting to 'scheduled'. Controls
--> branching on the public enrollment page (calendar vs interest form).
--> statement-breakpoint
CREATE TABLE "interest_signup" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" text NOT NULL,
  "group_type_id" text NOT NULL,
  "client_id" text NOT NULL,
  "athlete_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "converted_booking_id" text,
  "converted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_id_org_uq"
  UNIQUE ("id", "organizationId");--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_gt_athlete_uq"
  UNIQUE ("group_type_id", "athlete_id");--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_group_type_fk"
  FOREIGN KEY ("group_type_id", "organizationId")
  REFERENCES "group_type" ("id", "organizationId")
  ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_client_fk"
  FOREIGN KEY ("client_id", "organizationId")
  REFERENCES "client" ("id", "organizationId")
  ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_athlete_fk"
  FOREIGN KEY ("athlete_id", "organizationId")
  REFERENCES "athlete" ("id", "organizationId")
  ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_booking_fk"
  FOREIGN KEY ("converted_booking_id", "organizationId")
  REFERENCES "booking" ("id", "organizationId")
  ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "interest_signup" ADD CONSTRAINT "interest_signup_converted_at_check"
  CHECK (("converted_booking_id" IS NULL) = ("converted_at" IS NULL));--> statement-breakpoint
CREATE INDEX "interest_signup_org_idx" ON "interest_signup" ("organizationId");--> statement-breakpoint
CREATE INDEX "interest_signup_client_idx" ON "interest_signup" ("client_id");--> statement-breakpoint
ALTER TABLE "group_type" ADD COLUMN "status" text NOT NULL DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "group_type" ADD CONSTRAINT "group_type_status_check"
  CHECK ("status" IN ('scheduled', 'collecting_interest'));
