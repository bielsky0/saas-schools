"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { createAvailabilityAction } from "@/features/trainers/availability-actions";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

interface Props {
  trainerId: string;
}

export function AddAvailabilityForm({ trainerId }: Props) {
  const t = useTranslations("dashboard.trainers");
  const td = useTranslations("groups.days");

  const [state, action, pending] = useActionState(createAvailabilityAction, {});

  return (
    <form action={action} className="flex flex-col gap-4 border-t pt-6">
      <h2 className="text-sm font-medium">{t("formTitle")}</h2>

      <input type="hidden" name="trainerId" value={trainerId} />

      <div className="grid max-w-md grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dayOfWeek">{t("dayOfWeek")}</Label>
          <Select name="dayOfWeek" defaultValue="0">
            <SelectTrigger id="dayOfWeek">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {td(String(day) as "0" | "1" | "2" | "3" | "4" | "5" | "6")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startTime">{t("startTime")}</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="08:00" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endTime">{t("endTime")}</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="16:00" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="isActive">{t("active")}</Label>
          <Select name="isActive" defaultValue="true">
            <SelectTrigger id="isActive">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("active")}</SelectItem>
              <SelectItem value="false">-</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-xs text-green-600">{state.success}</p> : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
