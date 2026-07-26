--> HAND-WRITTEN (langlion plan Faza 26, EPIK 41, §2.40, Constraint 16).
-->
--> 1. Add group_type.requires_qualification_card boolean flag (default false).
--> 2. New qualification_card table — two-phase (parent before, leader after)
-->    health-and-safety form legally required for camp/colony organizers (MEN).
-->    Linked to (group_type, athlete), NOT to a specific booking — per spec
-->    decision: US-41.2/AC2, the same athlete on the same group_type reuses
-->    the existing row (Constraint 16: unique (group_type_id, athlete_id)).
-->
--> NO DATA GATE NEEDED: new column nullable/default false (no backfill),
--> new table starts empty.

ALTER TABLE "group_type" ADD COLUMN "requires_qualification_card" boolean DEFAULT false NOT NULL;

--> statement-breakpoint

CREATE TABLE "qualification_card" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" text NOT NULL,
	"athlete_id" text NOT NULL,
	"group_type_id" text NOT NULL,
	"status" text DEFAULT 'parent_pending' NOT NULL,
	"chronic_conditions" text,
	"medications" text,
	"allergies" text,
	"dietary_restrictions" text,
	"vaccinations_info" text,
	"parent_contact_during_camp" text,
	"health_during_camp" text,
	"incidents" text,
	"leader_signed_at" timestamp,
	"completed_by_user_id" text,
	"file_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_organizationId_organization_id_fk"
	FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_athlete_fk"
	FOREIGN KEY ("athlete_id","organizationId") REFERENCES "public"."athlete"("id","organizationId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_group_type_fk"
	FOREIGN KEY ("group_type_id","organizationId") REFERENCES "public"."group_type"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_id_org_uq"
	UNIQUE("id","organizationId");--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_file_id_file_id_fk"
	FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_completed_by_user_id_user_id_fk"
	FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_card" ADD CONSTRAINT "qualification_card_athlete_group_type_uq"
	UNIQUE("group_type_id","athlete_id");--> statement-breakpoint
CREATE INDEX "qualification_card_org_idx" ON "qualification_card" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "qualification_card_athlete_idx" ON "qualification_card" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "qualification_card_group_type_idx" ON "qualification_card" USING btree ("group_type_id");
