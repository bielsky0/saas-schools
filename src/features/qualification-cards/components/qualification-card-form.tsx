"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import { Button, FormField, FormMessage, Textarea, toast } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { completeParentPhaseAction } from "../actions";

const initial: FormState = {};

export type QualificationCardFormProps = {
  /** The athlete this card is for. */
  athleteId: string;
  /** The group type (camp offer) this card belongs to. */
  groupTypeId: string;
  /** Existing card data (for editing) — null means new card. */
  defaults?: {
    chronicConditions?: string | null;
    medications?: string | null;
    allergies?: string | null;
    dietaryRestrictions?: string | null;
    vaccinationsInfo?: string | null;
    parentContactDuringCamp?: string | null;
  } | null;
  /** Called on successful submit. */
  onSuccess?: () => void;
  /** Extra content below the form (e.g. navigation back). */
  children?: React.ReactNode;
};

/**
 * Parent phase of the qualification card (Faza 26, US-41.2).
 *
 * Used in two contexts:
 * 1. Inside the enrollment flow (`ConfirmStep` of `enrollment-flow.tsx`) —
 *    rendered as one step before submit, validated as part of the
 *    createBooking transaction.
 * 2. On the standalone card-fill page (`/karta/[groupTypeId]/[athleteId]`) —
 *    for the interest_signup → conversion flow (parent fills the card
 *    independently, then admin converts).
 *
 * The form can be hidden/showable when inside the enrollment flow; the
 * standalone page just renders it directly.
 */
export function QualificationCardForm({
  athleteId,
  groupTypeId,
  defaults,
  onSuccess,
  children,
}: QualificationCardFormProps) {
  const t = useTranslations("qualificationCards");
  const [state, action, pending] = useActionState(completeParentPhaseAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="groupTypeId" value={groupTypeId} />

      <p className="text-sm text-muted-foreground">{t("form.parentExplanation")}</p>

      <FormField label={t("form.chronicConditions")} htmlFor="qc-chronic">
        <Textarea
          id="qc-chronic"
          name="chronicConditions"
          defaultValue={defaults?.chronicConditions ?? ""}
          rows={3}
          placeholder={t("form.chronicConditionsPlaceholder")}
        />
      </FormField>

      <FormField label={t("form.medications")} htmlFor="qc-meds">
        <Textarea
          id="qc-meds"
          name="medications"
          defaultValue={defaults?.medications ?? ""}
          rows={3}
          placeholder={t("form.medicationsPlaceholder")}
        />
      </FormField>

      <FormField label={t("form.allergies")} htmlFor="qc-allergies">
        <Textarea
          id="qc-allergies"
          name="allergies"
          defaultValue={defaults?.allergies ?? ""}
          rows={3}
          placeholder={t("form.allergiesPlaceholder")}
        />
      </FormField>

      <FormField label={t("form.dietaryRestrictions")} htmlFor="qc-diet">
        <Textarea
          id="qc-diet"
          name="dietaryRestrictions"
          defaultValue={defaults?.dietaryRestrictions ?? ""}
          rows={2}
          placeholder={t("form.dietaryRestrictionsPlaceholder")}
        />
      </FormField>

      <FormField label={t("form.vaccinationsInfo")} htmlFor="qc-vax">
        <Textarea
          id="qc-vax"
          name="vaccinationsInfo"
          defaultValue={defaults?.vaccinationsInfo ?? ""}
          rows={2}
          placeholder={t("form.vaccinationsInfoPlaceholder")}
        />
      </FormField>

      <FormField label={t("form.parentContactDuringCamp")} htmlFor="qc-contact">
        <Textarea
          id="qc-contact"
          name="parentContactDuringCamp"
          defaultValue={defaults?.parentContactDuringCamp ?? ""}
          rows={2}
          placeholder={t("form.parentContactDuringCampPlaceholder")}
        />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("form.saving") : t("form.submit")}
        </Button>
        {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      </div>

      {children}
    </form>
  );
}
