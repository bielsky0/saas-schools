"use client";

import { useActionState, useEffect, useId } from "react";

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@/components/ui";
import { updateOrgSettingsAction } from "@/features/admin/org-console";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const SLOT_MINUTES = [15, 30, 60];

/**
 * Org-console settings form (apex-dashboard-plan 4.2 settings). Edits the
 * target org's own columns — the action re-checks `requireSuperAdmin()`.
 */
export function SettingsForm({
  organizationId,
  defaults,
  plans,
}: {
  organizationId: string;
  defaults: {
    name: string;
    timezone: string;
    currency: string;
    scheduleStartHour: number;
    scheduleEndHour: number;
    scheduleSlotMinutes: number;
    subdomain: string;
    planId: string | null;
  };
  plans: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateOrgSettingsAction, initial);
  const formId = useId();

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form id={formId} action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-name`}>Name</Label>
        <Input id={`${formId}-name`} name="name" defaultValue={defaults.name} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-timezone`}>Timezone (IANA)</Label>
        <Input id={`${formId}-timezone`} name="timezone" defaultValue={defaults.timezone} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-currency`}>Currency (ISO 4217)</Label>
        <Input id={`${formId}-currency`} name="currency" defaultValue={defaults.currency} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-subdomain`}>Subdomain</Label>
        <Input id={`${formId}-subdomain`} name="subdomain" defaultValue={defaults.subdomain} required />
        <span className="text-muted-foreground text-xs">DNS label — chooses the academy&apos;s public host.</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-start`}>Schedule start</Label>
          <Select name="scheduleStartHour" defaultValue={String(defaults.scheduleStartHour)}>
            <SelectTrigger id={`${formId}-start`} className="w-full">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-end`}>Schedule end</Label>
          <Select name="scheduleEndHour" defaultValue={String(defaults.scheduleEndHour)}>
            <SelectTrigger id={`${formId}-end`} className="w-full">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-slot`}>Slot length</Label>
          <Select name="scheduleSlotMinutes" defaultValue={String(defaults.scheduleSlotMinutes)}>
            <SelectTrigger id={`${formId}-slot`} className="w-full">
              <SelectValue placeholder="Minutes" />
            </SelectTrigger>
            <SelectContent>
              {SLOT_MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}&nbsp;min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-plan`}>Plan</Label>
        <Select name="planId" defaultValue={defaults.planId ?? "trial"}>
          <SelectTrigger id={`${formId}-plan`} className="w-full">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}