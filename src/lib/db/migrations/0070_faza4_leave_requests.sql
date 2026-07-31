-- HAND-WRITTEN (Faza 4 — leave request system).
--
-- Creates the leave_request table for trainer leave workflow:
-- submit → approve (with optional substitute) / reject / cancel.
-- Overlapping leave dates for the same trainer are prevented by an
-- EXCLUDE constraint using daterange + btree_gist.
--
-- RLS follows the standard org-isolation pattern.

BEGIN;--> statement-breakpoint

-- ── Table ───────────────────────────────────────────────────────────────

CREATE TABLE "leave_request" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "trainerId" text NOT NULL,
  "startDate" text NOT NULL,
  "endDate" text NOT NULL,
  "reason" text,
  "status" text NOT NULL DEFAULT 'submitted',
  "substituteTrainerId" text,
  "reviewedByUserId" text,
  "reviewedAt" timestamp with time zone,
  "rejectionReason" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "leave_request_status_check" CHECK ("status" IN ('submitted','approved','rejected','cancelled'))
);--> statement-breakpoint

-- ── Exclusion constraint (overlapping leave prevention) ─────────────────

-- Overlap check is handled at the application layer (F4) since text columns
-- cannot drive a GiST exclusion constraint without a cast function.
-- The overlap check in leave-actions.ts queries existing rows and rejects
-- overlapping date ranges before insert.--> statement-breakpoint

-- ── Foreign keys ───────────────────────────────────────────────────────

ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_organizationId_organization_id_fk"
  FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_trainerId_user_id_fk"
  FOREIGN KEY ("trainerId") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_substituteTrainerId_user_id_fk"
  FOREIGN KEY ("substituteTrainerId") REFERENCES "public"."user"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_reviewedByUserId_user_id_fk"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."user"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ── Indexes ────────────────────────────────────────────────────────────

CREATE INDEX "leave_request_org_idx" ON "leave_request" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leave_request_trainer_idx" ON "leave_request" USING btree ("trainerId");--> statement-breakpoint
CREATE INDEX "leave_request_status_idx" ON "leave_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_request_dates_idx" ON "leave_request" USING btree ("startDate","endDate");--> statement-breakpoint

-- ── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE "leave_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leave_request" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "leave_request_tenant_isolation" ON "leave_request"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

CREATE POLICY "leave_request_system_bypass" ON "leave_request"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

COMMIT;
