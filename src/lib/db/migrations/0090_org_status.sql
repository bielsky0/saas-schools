-- HAND-WRITTEN (apex-dashboard-plan Faza 2.1 — organization lifecycle status).
--
-- The org list filter needs a single, indexed `status` column instead of a
-- per-row CASE over subscription + deletedAt. Backfill derives it from the
-- newest subscription (by lastEventAt) and the soft-delete flag. Runtime writes
-- follow at exactly two points: applySubscriptionEvent (billing/webhooks.ts) and
-- the two soft-delete actions (features/admin/actions.ts) — see those call
-- sites for the invariant comment.
--
-- Status semantics: suspended <-> deletedAt set (soft delete is today's only
-- blocked state); trial = newest sub trialing; active = newest sub active;
-- inactive = newest sub in any other provider status (canceled, past_due, ...).
-- An org with NO subscription row keeps the column default 'trial' (fresh org,
-- never reached billing). Admin manual suspend/restore is a deliberate defer
-- (plan risk #2) — the column is the future home for it.
--
-- RLS: `organization` is NOT under RLS (verified: relrowsecurity=false), so
-- adding a column needs no policy work. The `app.bypass_rls = 'on'` GUC is
-- required anyway for the backfill's FROM-subquery: `subscription` IS under
-- FORCE RLS and is world otherwise invisible cross-tenant (its own
-- subscription_system_bypass policy, migration 0017, honors the corrected GUC).

BEGIN;--> statement-breakpoint

SET LOCAL "app.bypass_rls" = 'on';--> statement-breakpoint

ALTER TABLE "organization" ADD COLUMN "status" text NOT NULL DEFAULT 'trial';--> statement-breakpoint

ALTER TABLE "organization" ADD CONSTRAINT "organization_status_ck"
  CHECK ("status" IN ('trial', 'active', 'suspended', 'inactive'));--> statement-breakpoint

UPDATE "organization" o
SET "status" = CASE
  WHEN o."deletedAt" IS NOT NULL THEN 'suspended'
  WHEN ns.status = 'trialing' THEN 'trial'
  WHEN ns.status = 'active' THEN 'active'
  ELSE 'inactive'
END
FROM (
  SELECT DISTINCT ON (subscription."organizationId") subscription."organizationId", subscription.status
  FROM subscription
  WHERE subscription."organizationId" IS NOT NULL
  ORDER BY subscription."organizationId", subscription."lastEventAt" DESC
) ns
WHERE ns."organizationId" = o.id;--> statement-breakpoint

CREATE INDEX "organization_status_idx" ON "organization" USING btree ("status");--> statement-breakpoint

COMMIT;