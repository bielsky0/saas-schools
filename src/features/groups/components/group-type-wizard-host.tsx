"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/sonner";

import { createGroupTypeFromWizardAction } from "@/features/groups/actions";
import { GroupTypeWizard, type WizardContext } from "./group-type-wizard";

interface GroupTypeWizardHostProps {
  locations: { id: string; name: string }[];
  policyDocuments: { id: string; name: string; version: number }[];
  trainers: { id: string; label: string }[];
  enrollmentTemplates: { id: string; name: string }[];
}

export function GroupTypeWizardHost({
  locations,
  policyDocuments,
  trainers,
  enrollmentTemplates,
}: GroupTypeWizardHostProps) {
  const router = useRouter();
  const t = useTranslations("groups.wizard");
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (data: WizardContext) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.set("name", data.name ?? "");
    formData.set("groupSlug", data.slug ?? "");
    formData.set("description", data.description ?? "");
    formData.set("engine", data.engine ?? "schedule_first");
    formData.set("paymentPolicy", data.paymentPolicy ?? "both");
    formData.set("status", data.status ?? "scheduled");
    formData.set("price", "0");
    if (data.isNewClientOnly) formData.set("isNewClientOnly", "on");
    if (data.requiresQualificationCard) formData.set("requiresQualificationCard", "on");
    if (data.isTrialOffer) formData.set("isTrialOffer", "on");
    if (data.waitlistEnabled) formData.set("waitlistEnabled", "on");
    if (data.policyDocumentId) formData.set("policyDocumentId", data.policyDocumentId);
    for (const mode of data.allowedPurchaseModes ?? []) formData.append("allowedPurchaseModes", mode);
    for (const type of data.allowedBillingTypes ?? []) formData.append("allowedBillingTypes", type);
    if (data.defaultDurationMinutes) formData.set("defaultDurationMinutes", String(data.defaultDurationMinutes));
    if (data.enrollmentTemplateId) formData.set("enrollmentTemplateId", data.enrollmentTemplateId);

    if (data.recurrences && data.recurrences.length > 0) {
      formData.set("recurrences", JSON.stringify(data.recurrences));
    }
    if (data.productTemplates && data.productTemplates.length > 0) {
      formData.set("productTemplates", JSON.stringify(data.productTemplates));
    }

    try {
      const result = await createGroupTypeFromWizardAction({} as never, formData);
      if (result.success) {
        toast.success(result.success);
        if (result.redirect) {
          router.push(result.redirect);
        } else {
          router.push("/dashboard/group-types");
        }
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GroupTypeWizard
      locations={locations}
      policyDocuments={policyDocuments}
      trainers={trainers}
      enrollmentTemplates={enrollmentTemplates}
      onComplete={handleComplete}
      onCancel={() => router.push("/dashboard/group-types")}
    />
  );
}