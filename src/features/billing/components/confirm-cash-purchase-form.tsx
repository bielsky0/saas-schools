"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import {
  Button,
  FormField,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { confirmCashPurchaseAction } from "../purchase-actions";

const initial: FormState = {};

/**
 * Cash package purchase form (langlion §2.13, US-10.x, F12b).
 *
 * Reception selects a package, a client, and optionally a specific child.
 * The submit creates a credit_purchase entry, issues credits, and runs
 * auto-fill — all in one database transaction.
 *
 * The athlete list is not filtered by the selected client, and the server
 * rejects a mismatch. Same rationale as GrantCreditsForm: the list is small,
 * and the server-side check is the real boundary.
 */
export function ConfirmCashPurchaseForm({
  clients,
  productTemplates,
  athletes,
}: {
  clients: { id: string; email: string }[];
  productTemplates: { id: string; name: string; creditQuantity: number; price: number; creditTypeName: string }[];
  athletes: { id: string; name: string; parentClientId: string }[];
}) {
  const t = useTranslations("credits");
  const [state, action, pending] = useActionState(confirmCashPurchaseAction, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("purchase.productTemplate")} htmlFor="purchase-product-template">
          <Select name="productTemplateId">
            <SelectTrigger id="purchase-product-template" aria-label={t("purchase.productTemplate")}>
              <SelectValue placeholder={t("form.choose")} />
            </SelectTrigger>
            <SelectContent>
              {productTemplates.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name} ({row.creditQuantity} {t("purchase.productTemplate")}, {(row.price / 100).toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("purchase.client")} htmlFor="purchase-client">
          <Select name="clientId">
            <SelectTrigger id="purchase-client" aria-label={t("purchase.client")}>
              <SelectValue placeholder={t("form.choose")} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("purchase.athlete")} htmlFor="purchase-athlete" hint={t("purchase.athleteHint")}>
          <Select name="athleteId" defaultValue="">
            <SelectTrigger id="purchase-athlete" aria-label={t("purchase.athlete")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("purchase.familyWallet")}</SelectItem>
              {athletes.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("purchase.submitting") : t("purchase.submit")}
        </Button>
      </div>

      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
    </form>
  );
}
