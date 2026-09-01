"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/field";
import { Plus, Trash2 } from "lucide-react";

interface ProductTemplateDraft {
  name: string;
  description?: string;
  price: number;
  creditQuantity: number;
  billingType: "one_time" | "recurring";
  interval?: "month" | "year";
  intervalCount?: number;
  isActive: boolean;
}

interface WizardStepPricingProps {
  formData: {
    productTemplates?: ProductTemplateDraft[];
  };
  onChange: (data: { productTemplates?: ProductTemplateDraft[] }) => void;
}

export function WizardStepPricing({ formData, onChange }: WizardStepPricingProps) {
  const t = useTranslations("groups.pricing");
  const products = formData.productTemplates ?? [];

  const update = (index: number, patch: Partial<ProductTemplateDraft>) => {
    const next = products.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ productTemplates: next });
  };

  const remove = (index: number) => {
    onChange({ productTemplates: products.filter((_, i) => i !== index) });
  };

  const add = () => {
    onChange({
      productTemplates: [
        ...products,
        { name: "", price: 0, creditQuantity: 1, billingType: "one_time", isActive: true },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {products.map((product, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {t("editProduct")} #{index + 1}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label={t("delete")}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("name")} htmlFor={`prod-${index}-name`}>
                <Input
                  id={`prod-${index}-name`}
                  value={product.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </FormField>
              <FormField label={t("billingType")} htmlFor={`prod-${index}-billing`}>
                <Select
                  value={product.billingType}
                  onValueChange={(v) => update(index, { billingType: v as "one_time" | "recurring" })}
                >
                  <SelectTrigger id={`prod-${index}-billing`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">{t("billingTypeOptions.one_time")}</SelectItem>
                    <SelectItem value="recurring">{t("billingTypeOptions.recurring")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={t("price")} htmlFor={`prod-${index}-price`}>
                <Input
                  id={`prod-${index}-price`}
                  type="number"
                  min={1}
                  step={1}
                  value={product.price}
                  onChange={(e) => update(index, { price: Number(e.target.value) })}
                />
              </FormField>
              <FormField label={t("creditQuantity")} htmlFor={`prod-${index}-qty`}>
                <Input
                  id={`prod-${index}-qty`}
                  type="number"
                  min={1}
                  step={1}
                  value={product.creditQuantity}
                  onChange={(e) => update(index, { creditQuantity: Number(e.target.value) })}
                />
              </FormField>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={product.isActive}
                    onChange={(e) => update(index, { isActive: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  {t("isActive")}
                </label>
              </div>
            </div>

            {product.billingType === "recurring" && (
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <FormField label={t("interval")} htmlFor={`prod-${index}-interval`}>
                  <Select
                    value={product.interval ?? "month"}
                    onValueChange={(v) => update(index, { interval: v as "month" | "year" })}
                  >
                    <SelectTrigger id={`prod-${index}-interval`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">{t("intervalOptions.month")}</SelectItem>
                      <SelectItem value="year">{t("intervalOptions.year")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label={t("intervalCount")} htmlFor={`prod-${index}-count`}>
                  <Input
                    id={`prod-${index}-count`}
                    type="number"
                    min={1}
                    step={1}
                    value={product.intervalCount ?? 1}
                    onChange={(e) => update(index, { intervalCount: Number(e.target.value) })}
                  />
                </FormField>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={add}>
        <Plus className="mr-2 size-4" />
        {t("addProduct")}
      </Button>
    </div>
  );
}