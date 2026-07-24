--> HAND-WRITTEN (langlion plan Faza 17, EPIK 28, §2.18).
-->
--> policy_document — versioned policy documents per organisation.
--> policy_acceptance — frozen acceptance records for audit/legal evidence.
--> ALTER group_type ADD policyDocumentId — optional FK to the current policy.
-->
--> NO DATA GATE NEEDED: new tables start empty; no "rows without an owner"
--> can be a non-zero answer. group_type.policyDocumentId is nullable and
--> existing rows keep NULL — no backfill needed.
CREATE TABLE "policy_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"file_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "policy_acceptance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"client_id" text NOT NULL,
	"group_type_id" text NOT NULL,
	"policy_document_id" text NOT NULL,
	"policy_document_version" integer NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
ALTER TABLE "group_type" ADD COLUMN "policyDocumentId" text;--> statement-breakpoint
ALTER TABLE "policy_document" ADD CONSTRAINT "policy_document_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_document" ADD CONSTRAINT "policy_document_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_document" ADD CONSTRAINT "policy_document_id_org_uq" UNIQUE("id","organizationId");--> statement-breakpoint
CREATE INDEX "policy_document_org_idx" ON "policy_document" USING btree ("organizationId");--> statement-breakpoint
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_client_fk" FOREIGN KEY ("client_id","organizationId") REFERENCES "public"."client"("id","organizationId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_group_type_fk" FOREIGN KEY ("group_type_id","organizationId") REFERENCES "public"."group_type"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_policy_document_fk" FOREIGN KEY ("policy_document_id","organizationId") REFERENCES "public"."policy_document"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_id_org_uq" UNIQUE("id","organizationId");--> statement-breakpoint
CREATE INDEX "policy_acceptance_org_idx" ON "policy_acceptance" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "policy_acceptance_client_idx" ON "policy_acceptance" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "policy_acceptance_group_type_idx" ON "policy_acceptance" USING btree ("group_type_id");--> statement-breakpoint
ALTER TABLE "group_type" ADD CONSTRAINT "group_type_policy_document_fk" FOREIGN KEY ("policyDocumentId","organizationId") REFERENCES "public"."policy_document"("id","organizationId") ON DELETE set null ON UPDATE no action;
