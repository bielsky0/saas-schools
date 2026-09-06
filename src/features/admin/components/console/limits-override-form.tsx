"use client";

import { useActionState, useEffect, useId, useState } from "react";

import { Button, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@/components/ui";
import { deleteOrgOverrideAction, upsertOrgOverrideAction } from "@/features/admin/org-console";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

/**
 * Console limits override editor (apex-dashboard-plan 4.2 limits). Thin client
 * over the shared plans-data override actions (same tables, same audit), with
 * the console path revalidated by the org-console wrappers.
 */
export function LimitsOverrideForm({
  organizationId,
  keys,
  overrides,
}: {
  organizationId: string;
  keys: { key: string; label: string }[];
  overrides: { key: string; value: number | null }[];
}) {
  const [upsertState, upsert, upsertPending] = useActionState(upsertOrgOverrideAction, initial);
  const [deleteState, remove, deletePending] = useActionState(deleteOrgOverrideAction, initial);
  const [selectedKey, setSelectedKey] = useState(keys[0]?.key ?? "");
  const formId = useId();

  useEffect(() => {
    if (upsertState.success) toast.success(upsertState.success);
  }, [upsertState]);
  useEffect(() => {
    if (deleteState.success) toast.success(deleteState.success);
  }, [deleteState]);

  const error = upsertState.error ?? deleteState.error;

  return (
    <div className="grid max-w-xl gap-6">
      <form action={upsert} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="organizationId" value={organizationId} />
        <div>
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-key`}>
            Limit key
          </label>
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger id={`${formId}-key`} className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {keys.map((key) => (
                <SelectItem key={key.key} value={key.key}>
                  {key.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wide" htmlFor={`${formId}-value`}>
            Value (blank = unlimited)
          </label>
          <Input
            id={`${formId}-value`}
            name="limitKey"
            type="hidden"
            value={selectedKey}
          />
          <Input
            id={`${formId}-limitValue`}
            name="limitValue"
            type="number"
            min={0}
            placeholder="e.g. 200"
            className="sm:w-40"
          />
        </div>
        <Button type="submit" disabled={upsertPending || !selectedKey}>
          {upsertPending ? "Saving…" : "Save override"}
        </Button>
      </form>

      {overrides.length > 0 ? (
        <ul className="divide-border border-border divide-y rounded-md border">
          {overrides.map((override) => (
            <li key={override.key} className="flex items-center justify-between px-3 py-2">
              <div>
                <span className="text-sm font-medium">{override.key}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {override.value === null ? "unlimited" : override.value}
                </span>
              </div>
              <form action={remove}>
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="limitKey" value={override.key} />
                <Button type="submit" variant="ghost" size="sm" disabled={deletePending}>
                  {deletePending ? "Removing…" : "Remove"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No overrides — the plan limits apply.</p>
      )}

      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}