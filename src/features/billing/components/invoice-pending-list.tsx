"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button, Input } from "@/components/ui";
import { markInvoiceIssuedAction } from "../invoice-actions";
import type { FormState } from "@/lib/validation";
import type { PendingInvoiceRow } from "../invoice-data";

export function InvoicePendingList({
  pending,
}: {
  pending: PendingInvoiceRow[];
}) {
  const t = useTranslations("credits");

  if (pending.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("invoice.noPending")}</p>;
  }

  return (
    <div className="space-y-4">
      {pending.map((row) => (
        <PendingInvoiceCard key={row.purchaseId} row={row} />
      ))}
    </div>
  );
}

function PendingInvoiceCard({ row }: { row: PendingInvoiceRow }) {
  const t = useTranslations("credits");
  const [state, action, pending] = useActionState<FormState, FormData>(
    markInvoiceIssuedAction,
    {},
  );
  const submittedRef = useRef(false);

  useEffect(() => {
    if (state.success && !submittedRef.current) {
      submittedRef.current = true;
      toast.success(state.success);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="flex items-end gap-4 rounded-lg border p-4">
      <input type="hidden" name="purchaseId" value={row.purchaseId} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{row.clientName ?? row.clientEmail}</p>
        <p className="text-muted-foreground text-sm">
          {row.productTemplateName} &middot; {row.pricePaid / 100}
        </p>
        {row.invoiceRequestedAt ? (
          <p className="text-muted-foreground text-xs">
            {t("invoice.requestedAt")}: {row.invoiceRequestedAt.toLocaleDateString()}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-end gap-2">
        <Input
          name="invoiceNumber"
          placeholder={t("invoice.invoiceNumber")}
          required
          className="w-40"
        />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "…" : t("invoice.markIssued")}
        </Button>
      </div>
    </form>
  );
}
