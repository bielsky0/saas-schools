"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import {
  Button,
  FormField,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { createGroupTypeAction, updateGroupTypeAction } from "../actions";
import { billingType, engine, groupTypeStatus, paymentPolicy, purchaseMode } from "../schema";

const initial: FormState = {};

export type GroupTypeDefaults = {
  id: string;
  name: string;
  /** The GROUP TYPE's own public slug (`/zapisy/{slug}`), never the academy's. */
  slug: string;
  description: string | null;
  engine: string;
  paymentPolicy: string;
  price: number;
  isNewClientOnly: boolean;
  requiresQualificationCard: boolean;
  isTrialOffer: boolean;
  defaultLocationId: string | null;
  defaultMeetingUrl: string | null;
  policyDocumentId: string | null;
  allowedPurchaseModes: string[];
  allowedBillingTypes: string[] | null;
  status: string;
  /** Which trainers may teach this offer (empty/absent = all active trainers). */
  eligibleTrainerIds: string[] | null;
  /** Slot slicing for the slot-first engine (`computeAvailabilitySlots`). */
  defaultDurationMinutes: number | null;
};

/**
 * Group type form (langlion EPIK 2, EPIK 23) — one component, two modes.
 *
 * Create and edit post the same field set to two actions that validate with the
 * SAME zod schema, so the two can never drift on which fields are required. The
 * only structural difference is the hidden `groupTypeId` the edit mode carries.
 *
 * Every closed vocabulary here is rendered off the zod enum rather than a
 * hand-written list, for the reason spelled out in `invite-member-form.tsx`: an
 * option the action would reject is a form that fails after the user commits.
 *
 * NOTE `name="groupSlug"` for the offer's own slug. The form also posts the
 * The field is `name="groupSlug"`, not `name="slug"`. It used to need the
 * distinct name because the ORGANIZATION's slug travelled in the same FormData
 * under `name="slug"`; since F4.6 the academy comes from the request host and no
 * longer appears in the payload at all. The name stays as it is: the two slugs
 * live at different scopes (§2.27) and reusing the generic key would invite
 * exactly the collision it was renamed to avoid.
 */
export function GroupTypeForm({
  locations,
  policyDocuments,
  trainers,
  defaults,
}: {
  locations: { id: string; name: string }[];
  policyDocuments?: { id: string; name: string; version: number }[];
  trainers?: { id: string; label: string }[];
  defaults?: GroupTypeDefaults;
}) {
  const t = useTranslations("groups");
  const isEdit = Boolean(defaults);
  const [state, action, pending] = useActionState(
    isEdit ? updateGroupTypeAction : createGroupTypeAction,
    initial,
  );

  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {defaults ? <input type="hidden" name="groupTypeId" value={defaults.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("form.name")} htmlFor="gt-name">
          <Input id="gt-name" name="name" defaultValue={defaults?.name} required />
        </FormField>
        <FormField label={t("form.slug")} htmlFor="gt-slug" hint={t("form.slugHint")}>
          <Input id="gt-slug" name="groupSlug" defaultValue={defaults?.slug} required />
        </FormField>
      </div>

      <FormField
        label={t("form.description")}
        htmlFor="gt-description"
        hint={t("form.descriptionHint")}
      >
        <Textarea
          id="gt-description"
          name="description"
          defaultValue={defaults?.description ?? ""}
          rows={4}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label={t("form.engine")} htmlFor="gt-engine">
          <Select name="engine" defaultValue={defaults?.engine ?? "schedule_first"}>
            <SelectTrigger id="gt-engine" aria-label={t("form.engine")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {engine.options.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`engine.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("form.paymentPolicy")} htmlFor="gt-payment">
          <Select name="paymentPolicy" defaultValue={defaults?.paymentPolicy ?? "on_site"}>
            <SelectTrigger id="gt-payment" aria-label={t("form.paymentPolicy")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentPolicy.options.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`paymentPolicy.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("form.status")} htmlFor="gt-status" hint={t("form.statusHint")}>
          <Select name="status" defaultValue={defaults?.status ?? "scheduled"}>
            <SelectTrigger id="gt-status" aria-label={t("form.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupTypeStatus.options.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/*
          Minor units, entered as an integer (§2.14). No decimal input and no
          conversion layer: the number typed here is the number stored and the
          number Stripe is eventually handed, which is precisely what removes the
          rounding class of bug.
        */}
        <FormField label={t("form.price")} htmlFor="gt-price" hint={t("form.priceHint")}>
          <Input
            id="gt-price"
            name="price"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults?.price ?? 0}
            required
          />
        </FormField>
      </div>

      <FormField label={t("form.defaultLocation")} htmlFor="gt-location">
        <Select name="defaultLocationId" defaultValue={defaults?.defaultLocationId ?? ""}>
          <SelectTrigger id="gt-location" aria-label={t("form.defaultLocation")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("form.noLocation")}</SelectItem>
            {locations.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label={t("form.defaultMeetingUrl")} htmlFor="gt-meeting-url" hint={t("form.meetingUrlHint")}>
        <Input
          id="gt-meeting-url"
          name="defaultMeetingUrl"
          type="url"
          placeholder="https://meet.google.com/..."
          defaultValue={defaults?.defaultMeetingUrl ?? ""}
        />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("form.allowedPurchaseModes")}</legend>
        <div className="flex flex-wrap gap-4">
          {purchaseMode.options.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedPurchaseModes"
                value={value}
                defaultChecked={
                  defaults?.allowedPurchaseModes.includes(value) ?? value === "single_class"
                }
                className="accent-primary size-4"
              />
              {t(`purchaseMode.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("form.allowedBillingTypes")}</legend>
        <div className="flex flex-wrap gap-4">
          {billingType.options.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedBillingTypes"
                value={value}
                defaultChecked={defaults?.allowedBillingTypes?.includes(value) ?? false}
                className="accent-primary size-4"
              />
              {t(`billingType.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {trainers && trainers.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("form.eligibleTrainerIds")}</legend>
          <p className="text-muted-foreground text-xs">{t("form.eligibleTrainerIdsHint")}</p>
          <div className="flex flex-wrap gap-4">
            {trainers.map((trainer) => (
              <label key={trainer.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="eligibleTrainerIds"
                  value={trainer.id}
                  defaultChecked={defaults?.eligibleTrainerIds?.includes(trainer.id) ?? false}
                  className="accent-primary size-4"
                />
                {trainer.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("form.defaultDurationMinutes")}
          htmlFor="gt-duration"
          hint={t("form.defaultDurationMinutesHint")}
        >
          <Input
            id="gt-duration"
            name="defaultDurationMinutes"
            type="number"
            min={5}
            step={5}
            defaultValue={defaults?.defaultDurationMinutes ?? ""}
            placeholder="60"
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isNewClientOnly"
          defaultChecked={defaults?.isNewClientOnly ?? false}
          className="accent-primary size-4"
        />
        {t("form.isNewClientOnly")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresQualificationCard"
          defaultChecked={defaults?.requiresQualificationCard ?? false}
          className="accent-primary size-4"
        />
        {t("form.requiresQualificationCard")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isTrialOffer"
          defaultChecked={defaults?.isTrialOffer ?? false}
          className="accent-primary size-4"
        />
        {t("form.isTrialOffer")}
      </label>

      {policyDocuments ? (
        <FormField label={t("form.policyDocument")} htmlFor="gt-policy">
          <Select name="policyDocumentId" defaultValue={defaults?.policyDocumentId ?? ""}>
            <SelectTrigger id="gt-policy" aria-label={t("form.policyDocument")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("form.noPolicy")}</SelectItem>
              {policyDocuments.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name} (v{row.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {isEdit
            ? pending
              ? t("form.saving")
              : t("form.save")
            : pending
              ? t("form.submitting")
              : t("form.submit")}
        </Button>
        {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
