CREATE TABLE "group_change_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"clientId" text NOT NULL,
	"sourceBookingId" text NOT NULL,
	"targetSessionId" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"priceDifference" integer,
	"resultingBookingId" text,
	"stripePaymentIntentId" text,
	"expiresAt" timestamp with time zone,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedByUserId" text,
	"reviewedAt" timestamp with time zone,
	"rejectionReason" text,
	"cancelledByUserId" text,
	"cancellationReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_change_request_id_org_uq" UNIQUE("id","organizationId")
);
--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_client_fk" FOREIGN KEY ("clientId","organizationId") REFERENCES "public"."client"("id","organizationId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_source_booking_fk" FOREIGN KEY ("sourceBookingId","organizationId") REFERENCES "public"."booking"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_target_session_fk" FOREIGN KEY ("targetSessionId","organizationId") REFERENCES "public"."class_session"("id","organizationId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_resulting_booking_fk" FOREIGN KEY ("resultingBookingId","organizationId") REFERENCES "public"."booking"("id","organizationId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_reviewed_by_fk" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_change_request" ADD CONSTRAINT "group_change_request_cancelled_by_fk" FOREIGN KEY ("cancelledByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_change_request_org_idx" ON "group_change_request" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "group_change_request_source_booking_idx" ON "group_change_request" USING btree ("sourceBookingId");--> statement-breakpoint
CREATE INDEX "group_change_request_target_session_idx" ON "group_change_request" USING btree ("targetSessionId");--> statement-breakpoint
CREATE INDEX "group_change_request_status_idx" ON "group_change_request" USING btree ("status");
--> statement-breakpoint
-- Partial unique index: at most one open request per source booking (Faza 15, DuplicateChangeRequestError guard).
CREATE UNIQUE INDEX "group_change_request_active_uq" ON "group_change_request" ("sourceBookingId") WHERE "status" IN ('submitted', 'admin_approved', 'awaiting_payment');