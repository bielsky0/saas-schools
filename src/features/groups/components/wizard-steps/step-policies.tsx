"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/field";

import type { WizardContext } from "../group-type-wizard";

interface WizardStepPoliciesProps {
  formData: WizardContext;
  onChange: (data: Partial<WizardContext>) => void;
  policyDocuments?: { id: string; name: string; version: number }[];
}

export function WizardStepPolicies({ formData, onChange, policyDocuments = [] }: WizardStepPoliciesProps) {
  const t = useTranslations("groups");

  const purchaseModes = formData.allowedPurchaseModes ?? ["single_class"];
  const billingTypes = formData.allowedBillingTypes ?? [];

  const toggleMode = (mode: string) => {
    const current = purchaseModes.includes(mode)
      ? purchaseModes.filter((m) => m !== mode)
      : [...purchaseModes, mode];
    onChange({ allowedPurchaseModes: current });
  };

  const toggleBilling = (type: string) => {
    const current = billingTypes.includes(type)
      ? billingTypes.filter((b) => b !== type)
      : [...billingTypes, type];
    onChange({ allowedBillingTypes: current });
  };

  return (
    <div className="grid gap-5">
      <FormField label={t("form.paymentPolicy")} htmlFor="wz-payment">
        <Select
          value={formData.paymentPolicy ?? "both"}
          onValueChange={(v) => onChange({ paymentPolicy: v })}
        >
          <SelectTrigger id="wz-payment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online">{t("paymentPolicy.online")}</SelectItem>
            <SelectItem value="on_site">{t("paymentPolicy.on_site")}</SelectItem>
            <SelectItem value="both">{t("paymentPolicy.both")}</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {policyDocuments.length > 0 && (
        <FormField label={t("form.policyDocument")} htmlFor="wz-policy">
          <Select
            value={formData.policyDocumentId ?? ""}
            onValueChange={(v) => onChange({ policyDocumentId: v || undefined })}
          >
            <SelectTrigger id="wz-policy">
              <SelectValue placeholder={t("form.noPolicy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("form.noPolicy")}</SelectItem>
              {policyDocuments.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.name} (v{doc.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.isNewClientOnly ?? false}
            onChange={(e) => onChange({ isNewClientOnly: e.target.checked })}
            className="size-4 accent-primary"
          />
          {t("form.isNewClientOnly")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.requiresQualificationCard ?? false}
            onChange={(e) => onChange({ requiresQualificationCard: e.target.checked })}
            className="size-4 accent-primary"
          />
          {t("form.requiresQualificationCard")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.isTrialOffer ?? false}
            onChange={(e) => onChange({ isTrialOffer: e.target.checked })}
            className="size-4 accent-primary"
          />
          {t("form.isTrialOffer")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.waitlistEnabled ?? false}
            onChange={(e) => onChange({ waitlistEnabled: e.target.checked })}
            className="size-4 accent-primary"
          />
          {t("form.waitlistEnabled")}
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("form.allowedPurchaseModes")}</legend>
        <div className="flex flex-wrap gap-4">
          {["single_class", "package"].map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={purchaseModes.includes(mode)}
                onChange={() => toggleMode(mode)}
                className="size-4 accent-primary"
              />
              {t(`purchaseMode.${mode}` as "purchaseMode.single_class" | "purchaseMode.package")}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("form.allowedBillingTypes")}</legend>
        <div className="flex flex-wrap gap-4">
          {["one_time", "recurring"].map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={billingTypes.includes(type)}
                onChange={() => toggleBilling(type)}
                className="size-4 accent-primary"
              />
              {t(`billingType.${type}` as "billingType.one_time" | "billingType.recurring")}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}