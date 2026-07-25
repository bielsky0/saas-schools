"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { createRateAction } from "@/features/trainers/rate-actions";
import type { FormState } from "@/lib/validation";

interface Props {
  trainers: { id: string; name: string | null }[];
  groupTypes: { id: string; name: string }[];
}

export function AddRateForm({ trainers, groupTypes }: Props) {
  const t = useTranslations("dashboard.trainers");
  const [state, action, pending] = useActionState(createRateAction, {} as FormState);

  return (
    <form action={action} className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">{t("rateFormTitle")}</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trainerId">{t("rateFormTrainer")}</Label>
        <Select name="trainerId" required>
          <SelectTrigger>
            <SelectValue placeholder={t("rateFormTrainer")} />
          </SelectTrigger>
          <SelectContent>
            {trainers.map((tr) => (
              <SelectItem key={tr.id} value={tr.id}>
                {tr.name ?? tr.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">{t("rateFormAmount")}</Label>
        <Input id="amount" name="amount" type="number" min={1} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="effectiveFrom">{t("rateFormEffectiveFrom")}</Label>
        <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rateType">{t("rateFormRateType")}</Label>
        <Select name="rateType" defaultValue="flat_per_session">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat_per_session">{t("flat_per_session")}</SelectItem>
            <SelectItem value="hourly">{t("hourly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="groupTypeId">{t("rateFormGroupType")}</Label>
        <Select name="groupTypeId">
          <SelectTrigger>
            <SelectValue placeholder={t("baseRate")} />
          </SelectTrigger>
          <SelectContent>
            {groupTypes.map((gt) => (
              <SelectItem key={gt.id} value={gt.id}>
                {gt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{t("rateFormGroupType")}</p>
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-xs text-green-600">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
