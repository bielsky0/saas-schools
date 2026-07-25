"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui";
import { requestInvoiceAction } from "../invoice-actions";
import type { FormState } from "@/lib/validation";

export function RequestInvoiceButton({ purchaseId }: { purchaseId: string }) {
  const t = useTranslations("credits");
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestInvoiceAction,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : t("invoice.request")}
      </Button>
      {state.success ? (
        <p className="text-success mt-1 text-xs">{state.success}</p>
      ) : state.error ? (
        <p className="text-destructive mt-1 text-xs">{state.error}</p>
      ) : null}
    </form>
  );
}
