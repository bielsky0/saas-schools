--> HAND-WRITTEN (langlion plan Faza 27, EPIK 42, §2.41).
-->
--> New table extra_fee — one-time ad-hoc charges (uniforms, materials, entry
--> fees, field trips) intentionally OUTSIDE the credit system (§2.41, Rozstrzygnięcie
--> #35). Never touches credit; never appears in wallet (§7.12).
-->
--> Status: pending | paid | cancelled (no refunded — Rozstrzygnięcie #33).
--> Payment: online (via Connect ad-hoc price_data) | cash (staff-confirmed).
-->
--> FK rules:
-->   client_id     → RESTRICT  (cannot delete a client with outstanding fees)
-->   athlete_id    → SET NULL  (nullable, fee can exist without athlete)
-->   booking_id    → SET NULL  (optional reference)
-->   group_type_id → SET NULL  (optional reference)
-->   session_id    → SET NULL  (optional reference)
-->   created_by_user_id → RESTRICT (NOT NULL, users are soft-deleted)
-->   invoice_issued_by_user_id → SET NULL (standard user-reference)
-->
--> Invoice fields follow credit_purchase pattern (Faza 19, §2.17): purely
--> administrative — never block the purchase path (US-27.3).
-->
--> Soft delete: is_active + deleted_at (like policy_document).
-->
--> NO DATA GATE NEEDED: new table starts empty.

CREATE TABLE "extra_fee" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"athlete_id" text,
	"booking_id" text,
	"group_type_id" text,
	"session_id" text,
	"amount" integer NOT NULL,
	"currency_snapshot" jsonb NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text NOT NULL,
	"stripe_payment_intent_id" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"invoice_requested_at" timestamp,
	"invoice_issued_at" timestamp,
	"invoice_number" text,
	"invoice_issued_by_user_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp
);

--> statement-breakpoint

ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_organization_fk"
	FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_client_fk"
	FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."client"("id","organizationId") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_athlete_fk"
	FOREIGN KEY ("athlete_id","organization_id") REFERENCES "public"."athlete"("id","organizationId") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_booking_fk"
	FOREIGN KEY ("booking_id","organization_id") REFERENCES "public"."booking"("id","organizationId") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_group_type_fk"
	FOREIGN KEY ("group_type_id","organization_id") REFERENCES "public"."group_type"("id","organizationId") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_session_fk"
	FOREIGN KEY ("session_id","organization_id") REFERENCES "public"."class_session"("id","organizationId") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_created_by_user_fk"
	FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extra_fee" ADD CONSTRAINT "extra_fee_invoice_issued_by_user_fk"
	FOREIGN KEY ("invoice_issued_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "extra_fee_org_idx" ON "extra_fee" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "extra_fee_client_idx" ON "extra_fee" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "extra_fee_session_idx" ON "extra_fee" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "extra_fee_status_idx" ON "extra_fee" USING btree ("status");
