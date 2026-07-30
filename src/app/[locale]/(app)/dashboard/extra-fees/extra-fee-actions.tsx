"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui"
import { confirmCashExtraFeeAction, cancelExtraFeeAction } from "@/features/extra-fees/actions"

export function ExtraFeeActions({
  feeId,
  status,
}: {
  feeId: string
  status: string
}) {
  const t = useTranslations("extraFees")
  const [, confirmAction, confirmPending] = useActionState(confirmCashExtraFeeAction, {})
  const [, cancelAction, cancelPending] = useActionState(cancelExtraFeeAction, {})

  if (status !== "pending") return null

  return (
    <div className="flex items-center justify-end gap-2">
      <form action={confirmAction}>
        <input type="hidden" name="extraFeeId" value={feeId} />
        <Button type="submit" variant="outline" size="sm" disabled={confirmPending}>
          {t("confirm")}
        </Button>
      </form>
      <form action={cancelAction}>
        <input type="hidden" name="extraFeeId" value={feeId} />
        <Button type="submit" variant="outline" size="sm" disabled={cancelPending}>
          {t("cancel")}
        </Button>
      </form>
    </div>
  )
}
