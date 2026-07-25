"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormMessage, Label } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  grantPriceOverrideAction,
  deactivatePriceOverrideAction,
} from "@/features/pricing/actions";
import type { FormState } from "@/lib/validation";

type OverrideRow = {
  id: string;
  groupTypeId: string | null;
  overrideType: "percent_discount" | "fixed_price";
  value: number;
  validFrom: string;
  validUntil: string | null;
  reason: string;
  isActive: boolean;
  createdAt: Date;
};

type GroupTypeOption = { id: string; name: string };

type Labels = {
  title: string;
  active: string;
  inactive: string;
  percentDiscount: string;
  fixedPrice: string;
  validFrom: string;
  validUntil: string;
  reason: string;
  deactivate: string;
  noOverrides: string;
};

function GrantForm({
  clientId,
  groupTypes,
}: {
  clientId: string;
  groupTypes: GroupTypeOption[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    grantPriceOverrideAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      window.location.reload();
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3 rounded border p-4">
      <h3 className="font-medium">New override</h3>
      <input type="hidden" name="clientId" value={clientId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ov-group">Group type</Label>
          <Select name="groupTypeId">
            <SelectTrigger id="ov-group">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All groups (academy-wide)</SelectItem>
              {groupTypes.map((gt) => (
                <SelectItem key={gt.id} value={gt.id}>
                  {gt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ov-type">Type</Label>
          <Select name="overrideType" defaultValue="percent_discount">
            <SelectTrigger id="ov-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent_discount">Percent discount</SelectItem>
              <SelectItem value="fixed_price">Fixed price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ov-value">Value</Label>
          <Input id="ov-value" name="value" type="number" min={0} defaultValue={0} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ov-from">Valid from</Label>
          <Input id="ov-from" name="validFrom" type="date" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ov-until">Valid until</Label>
          <Input id="ov-until" name="validUntil" type="date" />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="ov-reason">Reason</Label>
          <Textarea id="ov-reason" name="reason" rows={2} required />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Granting..." : "Grant override"}
      </Button>

      {state.error && <FormMessage>{state.error}</FormMessage>}
    </form>
  );
}

export function ClientOverrideManager({
  clientId,
  groupTypes,
  overrides,
  labels: _labels,
}: {
  clientId: string;
  groupTypes: GroupTypeOption[];
  overrides: OverrideRow[];
  labels: Labels;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Price overrides</h2>
        {overrides.length === 0 ? (
          <p className="text-muted-foreground text-sm">{_labels.noOverrides}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-2 py-1 font-medium">Type</th>
                  <th className="px-2 py-1 font-medium">Value</th>
                  <th className="px-2 py-1 font-medium">Group</th>
                  <th className="px-2 py-1 font-medium">Valid</th>
                  <th className="px-2 py-1 font-medium">Reason</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                  <th className="px-2 py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {overrides.map((o) => (
                  <OverrideRow
                    key={o.id}
                    override={o}
                    groupTypes={groupTypes}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GrantForm clientId={clientId} groupTypes={groupTypes} />
    </div>
  );
}

function OverrideRow({
  override,
  groupTypes,
}: {
  override: OverrideRow;
  groupTypes: GroupTypeOption[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    deactivatePriceOverrideAction,
    {},
  );

  useEffect(() => {
    if (state.success) window.location.reload();
  }, [state]);

  const gtName = override.groupTypeId
    ? groupTypes.find((g) => g.id === override.groupTypeId)?.name ?? "Unknown"
    : "All groups";

  const validRange = [override.validFrom, override.validUntil]
    .filter(Boolean)
    .join(" – ");

  return (
    <tr className="border-b">
      <td className="px-2 py-1">
        {override.overrideType === "percent_discount"
          ? "Percent discount"
          : "Fixed price"}
      </td>
      <td className="px-2 py-1">
        {override.overrideType === "percent_discount"
          ? `${override.value}%`
          : override.value}
      </td>
      <td className="px-2 py-1">{gtName}</td>
      <td className="px-2 py-1">{validRange || "—"}</td>
      <td className="px-2 py-1 max-w-[200px] truncate" title={override.reason}>
        {override.reason}
      </td>
      <td className="px-2 py-1">
        {override.isActive ? "Active" : "Inactive"}
      </td>
      <td className="px-2 py-1">
        {override.isActive && (
          <form action={action}>
            <input type="hidden" name="overrideId" value={override.id} />
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              Deactivate
            </Button>
          </form>
        )}
      </td>
    </tr>
  );
}
