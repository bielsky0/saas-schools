-- HAND-WRITTEN (Faza 0+1 apex dashboard — coupons, 0.5–0.6).
--
-- `admin_coupon` (discount code definitions, scoped global/group/org) +
-- `admin_coupon_redemption` (per-org activation journal). GLOBAL / bypass-only.

BEGIN;--> statement-breakpoint

CREATE TABLE "admin_coupon" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "type" text NOT NULL,
  "value" integer NOT NULL,
  "currency" text,
  "expires_at" timestamp,
  "max_activations" integer,
  "scope" text NOT NULL,
  "scope_id" text,
  "created_by_user_id" text NOT NULL REFERENCES "public"."user"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "admin_coupon" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_coupon" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_coupon_system_bypass" ON "admin_coupon"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE TABLE "admin_coupon_redemption" (
  "id" text PRIMARY KEY NOT NULL,
  "coupon_id" text NOT NULL REFERENCES "public"."admin_coupon"("id") ON DELETE cascade,
  "organization_id" text NOT NULL REFERENCES "public"."organization"("id"),
  "activated_at" timestamp DEFAULT now() NOT NULL,
  "activated_by_user_id" text
);--> statement-breakpoint

ALTER TABLE "admin_coupon_redemption" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_coupon_redemption" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_coupon_redemption_system_bypass" ON "admin_coupon_redemption"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "admin_coupon_redemption_coupon_idx" ON "admin_coupon_redemption" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "admin_coupon_redemption_org_idx" ON "admin_coupon_redemption" USING btree ("organization_id");--> statement-breakpoint

COMMIT;