"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Badge, Button, Input } from "@/components/ui";
import type { BillingDiscount } from "@/lib/adapters/billing/contract";
import type { FormState } from "@/lib/validation";
import { applyCouponAction } from "@/features/billing/coupon-actions";

/**
 * Coupon redemption form (apex-dashboard-plan Faza 5, §5.2).
 *
 * Rendered only for ORGANIZATION owners (redemptions carry a NOT NULL
 * organization_id). On success the applied discount is echoed back so the user
 * sees what their next checkout will save; the checkout itself reads the same
 * redemption server-side (`checkout.ts` → `discountForOrg`), so the code is
 * never trusted from the client.
 */

export type CouponFormState = FormState & { discount?: BillingDiscount };

export function CouponForm() {
  const t = useTranslations("billing");
  const [state, action, pending] = useActionState<CouponFormState, FormData>(
    applyCouponAction as (prev: CouponFormState, fd: FormData) => Promise<CouponFormState>,
    {},
  );

  const active = state?.discount;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="coupon-code">
          {t("coupon")}
        </label>
        <Input
          id="coupon-code"
          name="code"
          placeholder="WELCOME20"
          className="w-48 uppercase"
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Applying…" : t("applyCoupon")}
      </Button>

      {active ? (
        <Badge className="ml-2">
          {active.type === "percent"
            ? `${active.value}% off applied`
            : `${active.value} ${active.currency?.toUpperCase() ?? ""} off applied`}
        </Badge>
      ) : state?.error ? (
        <span className="text-destructive text-sm">{state.error}</span>
      ) : null}
    </form>
  );
}