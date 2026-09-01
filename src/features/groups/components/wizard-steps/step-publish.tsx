"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/field";
import { CheckCircle, ExternalLink } from "lucide-react";

import type { WizardContext } from "../group-type-wizard";

interface WizardStepPublishProps {
  formData: WizardContext;
  onChange: (data: Partial<WizardContext>) => void;
  enrollmentTemplates: { id: string; name: string }[];
}

export function WizardStepPublish({ formData, onChange, enrollmentTemplates }: WizardStepPublishProps) {
  const t = useTranslations("groups.wizard");
  const tg = useTranslations("groups");

  const templateId = formData.enrollmentTemplateId ?? enrollmentTemplates[0]?.id ?? "";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="size-5 text-green-600" />
            {t("publishSection.summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            ✓ {t("publishSection.checks.basics")}: {formData.name || "—"}
          </p>
          <p>
            ✓ {t("publishSection.checks.engine")}: {formData.engine || "—"}
          </p>
          <p>
            ✓ {t("publishSection.checks.schedule")}: {formData.recurrences?.length || 0} wzorców
          </p>
          <p>
            ✓ {t("publishSection.checks.pricing")}: {formData.productTemplates?.length || 0} produktów
          </p>
        </CardContent>
      </Card>

      <FormField label={t("publishSection.status")} htmlFor="wz-status">
        <Select
          value={formData.status ?? "scheduled"}
          onValueChange={(v) => onChange({ status: v })}
        >
          <SelectTrigger id="wz-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">{tg("status.scheduled")}</SelectItem>
            <SelectItem value="collecting_interest">{tg("status.collecting_interest")}</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {enrollmentTemplates.length > 0 && (
        <FormField label={t("publishSection.template")} htmlFor="wz-template" hint={t("publishSection.templateHint")}>
          <Select value={templateId} onValueChange={(v) => onChange({ enrollmentTemplateId: v })}>
            <SelectTrigger id="wz-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enrollmentTemplates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className="rounded-lg border bg-blue-50 p-4">
        <h4 className="mb-3 font-medium text-blue-800">{t("publishSection.nextSteps")}</h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
          <li>{t("publishSection.steps.editPage")}</li>
          <li>{t("publishSection.steps.testBooking")}</li>
          <li>{t("publishSection.steps.shareLink")}</li>
        </ol>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <a
              href={`/editor?pageType=enrollment_template&templateId=${templateId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 size-4" />
              {t("publishSection.editInBuilder")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}