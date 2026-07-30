"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, Label } from "@/components/ui"
import { createExtraFeeAction } from "@/features/extra-fees/actions"

interface ClientOption {
  id: string
  name: string | null
  email: string
}

export function ExtraFeeForm({ clients }: { clients: ClientOption[] }) {
  const t = useTranslations("extraFees")
  const [state, formAction, pending] = useActionState(createExtraFeeAction, {})

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">{t("create")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>
        <form action={formAction}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("form.client")}</Label>
              <select
                name="clientId"
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <option value="">{t("form.selectClient")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("form.description")}</Label>
              <Input name="description" required maxLength={500} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("form.amount")} (grosze)</Label>
              <Input name="amount" type="number" required min={1} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("form.paymentMethod")}</Label>
              <select
                name="paymentMethod"
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <option value="cash">{t("paymentMethodCash")}</option>
                <option value="online">{t("paymentMethodOnline")}</option>
              </select>
            </div>
            {state?.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
            {state?.success && (
              <p className="text-success text-sm">{state.success}</p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
