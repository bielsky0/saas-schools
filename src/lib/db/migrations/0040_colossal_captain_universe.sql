--> HAND-WRITTEN (langlion plan Faza 20, EPIK 32, §2.30).
-->
--> Create trainer_rate table — informational-only wage records.
--> Drizzle-kit generated the rest of the differences between snapshot 0032
--> and the current schema; those were stripped because they duplicate
--> hand-written migrations 0033-0039.
--> statement-breakpoint
CREATE TABLE "trainer_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"trainerId" text NOT NULL,
	"groupTypeId" text,
	"amount" integer NOT NULL,
	"effectiveFrom" timestamp with time zone NOT NULL,
	"rateType" text DEFAULT 'flat_per_session' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_rate_id_org_uq" UNIQUE("id","organizationId"),
	CONSTRAINT "trainer_rate_base_uq" UNIQUE NULLS NOT DISTINCT("organizationId","trainerId","groupTypeId","effectiveFrom")
);--> statement-breakpoint
ALTER TABLE "trainer_rate" ADD CONSTRAINT "trainer_rate_organizationId_organization_id_fk"
  FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_rate" ADD CONSTRAINT "trainer_rate_trainerId_user_id_fk"
  FOREIGN KEY ("trainerId") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_rate" ADD CONSTRAINT "trainer_rate_group_type_fk"
  FOREIGN KEY ("groupTypeId","organizationId") REFERENCES "public"."group_type"("id","organizationId")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trainer_rate_org_idx" ON "trainer_rate" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "trainer_rate_trainer_idx" ON "trainer_rate" USING btree ("trainerId");
