-- HAND-WRITTEN (Faza 5 — coupon redemption idempotency, apex-dashboard-plan §5.2).
--
-- Unique index on (coupon_id, organization_id) ensures at most one active
-- redemption per coupon per organization. Prevents double-activation races
-- on concurrent applyCouponAction calls.

BEGIN;--> statement-breakpoint

CREATE UNIQUE INDEX "admin_coupon_redemption_coupon_org_uq" ON "admin_coupon_redemption" USING btree ("coupon_id", "organization_id");--> statement-breakpoint

COMMIT;
