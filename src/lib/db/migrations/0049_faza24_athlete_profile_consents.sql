--> HAND-WRITTEN (langlion plan Faza 24, EPIK 37, §2.35).
-->
--> 1. Add athlete profile columns: emergency contact + health notes (nullable, §US-4.1).
--> 2. New consent_document table — versioned consent documents (same pattern as
-->    policy_document from F17). supersedes_id is a composite FK back to the
-->    same table for defense-in-depth against cross-tenant references.
--> 3. New athlete_consent table — frozen acceptance/refusal per athlete per
-->    consent version (same pattern as policy_acceptance from F17).
-->
--> NO DATA GATE NEEDED: new columns nullable (no backfill), new tables start empty.

ALTER TABLE "athlete" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "athlete" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "athlete" ADD COLUMN "health_notes" text;

--> statement-breakpoint

CREATE TABLE "consent_document" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"file_id" text,
	"body" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_required_at_signup" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"supersedes_id" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);

--> statement-breakpoint

CREATE TABLE "athlete_consent" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizationId" text NOT NULL,
	"client_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"consent_document_id" text NOT NULL,
	"consent_document_version" integer NOT NULL,
	"granted" boolean NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);

--> statement-breakpoint

ALTER TABLE "consent_document" ADD CONSTRAINT "consent_document_organizationId_organization_id_fk"
	FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document" ADD CONSTRAINT "consent_document_file_id_file_id_fk"
	FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document" ADD CONSTRAINT "consent_document_id_org_uq"
	UNIQUE("id","organizationId");--> statement-breakpoint
ALTER TABLE "consent_document" ADD CONSTRAINT "consent_document_supersedes_fk"
	FOREIGN KEY ("supersedes_id","organizationId") REFERENCES "public"."consent_document"("id","organizationId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_document_org_idx" ON "consent_document" USING btree ("organizationId");--> statement-breakpoint

ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_organizationId_organization_id_fk"
	FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_client_fk"
	FOREIGN KEY ("client_id","organizationId") REFERENCES "public"."client"("id","organizationId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_athlete_fk"
	FOREIGN KEY ("athlete_id","organizationId") REFERENCES "public"."athlete"("id","organizationId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_consent_document_fk"
	FOREIGN KEY ("consent_document_id","organizationId") REFERENCES "public"."consent_document"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_id_org_uq"
	UNIQUE("id","organizationId");--> statement-breakpoint
CREATE INDEX "athlete_consent_org_idx" ON "athlete_consent" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "athlete_consent_client_idx" ON "athlete_consent" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "athlete_consent_athlete_idx" ON "athlete_consent" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "athlete_consent_consent_document_idx" ON "athlete_consent" USING btree ("consent_document_id");
