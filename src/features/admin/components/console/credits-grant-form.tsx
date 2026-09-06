"use client";

import { useActionState, useEffect, useId, useState } from "react";

import { Button, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@/components/ui";
import { grantOrgCreditsAction } from "@/features/admin/org-console";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

/**
 * Console credits grant (apex-dashboard-plan 4.2 credits). Super-admin variant
 * of the org grant flow — the target org comes from the URL; the acting
 * principal is recorded as the audit actor.
 */
export function CreditsGrantForm({
  organizationId,
  creditTypes,
  clients,
}: {
  organizationId: string;
  creditTypes: { id: string; name: string }[];
  clients: { id: string; email: string; name: string | null }[];
}) {
  const [state, action, pending] = useActionState(grantOrgCreditsAction, initial);
  const [creditTypeId, setCreditTypeId] = useState(creditTypes[0]?.id ?? "");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const formId = useId();

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-1.5">
        <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-client`}>
          Client (family wallet)
        </label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger id={`${formId}-client`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.email}
                {client.name ? ` — ${client.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="clientId" value={clientId} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-type`}>
          Credit type
        </label>
        <Select value={creditTypeId} onValueChange={setCreditTypeId}>
          <SelectTrigger id={`${formId}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {creditTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="creditTypeId" value={creditTypeId} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-quantity`}>
          Quantity
        </label>
        <Input id={`${formId}-quantity`} name="quantity" type="number" min={1} defaultValue={1} required />
      </div>
      <div className="grid gap-1.5">
        <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-reason`}>
          Reason
        </label>
        <Input
          id={`${formId}-reason`}
          name="reason"
          required
          placeholder="e.g. Compensation for cancelled camp week"
        />
      </div>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Granting…" : "Grant credits"}
        </Button>
      </div>
    </form>
  );
}