--> HAND-WRITTEN (langlion plan Faza 17.5, EPIK 34, §2.32).
-->
--> trainer_availability — per-trainer weekly availability windows.
--> ALTER group_type ADD defaultDurationMinutes, defaultCapacity.
-->
--> NO DATA GATE NEEDED: new table starts empty; group_type columns are
--> nullable, existing rows keep NULL.
CREATE TABLE "trainer_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"trainerId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" time NOT NULL,
	"endTime" time NOT NULL,
	"locationId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_type" ADD COLUMN "defaultDurationMinutes" integer;--> statement-breakpoint
ALTER TABLE "group_type" ADD COLUMN "defaultCapacity" integer;--> statement-breakpoint
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_trainerId_user_id_fk" FOREIGN KEY ("trainerId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_location_fk" FOREIGN KEY ("locationId","organizationId") REFERENCES "public"."location"("id","organizationId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_id_org_uq" UNIQUE("id","organizationId");--> statement-breakpoint
CREATE INDEX "trainer_availability_org_idx" ON "trainer_availability" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "trainer_availability_trainer_idx" ON "trainer_availability" USING btree ("trainerId");--> statement-breakpoint
CREATE INDEX "trainer_availability_day_idx" ON "trainer_availability" USING btree ("dayOfWeek");
