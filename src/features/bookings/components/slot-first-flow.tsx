"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@/components/ui";
import type { ComputedSlot } from "@/features/trainers/availability-slots";
import type { PaymentMethodView } from "../payment-options";
import { createSlotFirstBookingAction, type CreateSlotFirstState } from "../slot-first-public";
import {
  EnrollmentRecognized,
  FieldError,
  PolicyDocumentProp,
  SuccessStep,
  VerifyStep,
  ViewDocumentLink,
  ConsentDocumentProp,
} from "./enrollment-flow";

/**
 * Public slot-first enrollment (Faza 5, EPIK 34, §2.32).
 *
 * The schedule-first flow books an EXISTING session; this flow books a TIME on
 * a trainer — the `class_session` does not exist yet. Trainer → slot → verify →
 * confirm, then `createSlotFirstBookingAction` creates the session and the
 * booking in one transaction.
 *
 * Reuses the shared steps from `enrollment-flow.tsx` (VerifyStep, SuccessStep,
 * policy/consent rendering); only the calendar and the confirm form differ,
 * because what is being confirmed is a trainer+startTime, not a sessionId.
 */
export interface SlotFirstFlowProps {
  groupTypeSlug: string;
  groupTypeName: string;
  price: number;
  discountedPrice?: number;
  currency: string;
  isNewClientOnly: boolean;
  requiresQualificationCard: boolean;
  methods: PaymentMethodView[];
  /** Eligible trainers, pre-filtered by `eligibleTrainerIds` when set. */
  trainers: { id: string; name: string | null }[];
  /** Slots per trainer for the shown month, from `listSlotFirstAvailability`. */
  availability: { trainerId: string; slots: ComputedSlot[] }[];
  /** From `?trainerId=` — the trainer to preselect. */
  defaultTrainerId?: string;
  month: string;
  prevMonth: string;
  nextMonth: string;
  recognized: EnrollmentRecognized | null;
  policyDocument: PolicyDocumentProp | null;
  consentDocuments: ConsentDocumentProp[];
}

export function SlotFirstFlow(props: SlotFirstFlowProps) {
  const t = useTranslations("enrollment");
  const locale = useLocale();
  const router = useRouter();

  const money = (minor: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: props.currency }).format(
      minor / 100,
    );

  const [trainerId, setTrainerId] = useState<string>(
    props.defaultTrainerId && props.trainers.some((tr) => tr.id === props.defaultTrainerId)
      ? props.defaultTrainerId
      : (props.trainers[0]?.id ?? ""),
  );
  const [slot, setSlot] = useState<ComputedSlot | null>(null);
  const [verified, setVerified] = useState<boolean>(props.recognized !== null);
  const [bookingResult, setBookingResult] = useState<CreateSlotFirstState | null>(null);

  const trainer = props.trainers.find((tr) => tr.id === trainerId) ?? null;
  const trainerSlots = props.availability.find((a) => a.trainerId === trainerId)?.slots ?? [];

  const slotsByDay = new Map<string, ComputedSlot[]>();
  for (const s of trainerSlots) {
    const list = slotsByDay.get(s.dayKey) ?? [];
    list.push(s);
    slotsByDay.set(s.dayKey, list);
  }
  const days = [...slotsByDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  // Online payment needs the checkout URL returned by the action.
  useEffect(() => {
    if (bookingResult?.checkoutUrl) {
      window.location.href = bookingResult.checkoutUrl;
    }
  }, [bookingResult]);

  if (bookingResult?.success) {
    return <SuccessStep message={bookingResult.success} />;
  }

  return (
    <div className="mt-6 space-y-6">
      <p className="text-lg font-medium">
        {props.discountedPrice != null && props.discountedPrice !== props.price ? (
          <>
            <span className="text-muted-foreground mr-2 line-through">
              {t("offer.price", { price: money(props.price) })}
            </span>
            <span className="text-green-700">{money(props.discountedPrice)}</span>
          </>
        ) : (
          t("offer.price", { price: money(props.price) })
        )}
      </p>
      {props.isNewClientOnly ? <Badge>{t("offer.newClientOnly")}</Badge> : null}

      {/* Step 1 — the trainer. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("slotFirst.chooseTrainer")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            value={trainerId}
            onChange={(e) => {
              setTrainerId(e.target.value);
              setSlot(null);
            }}
            className="border-input w-full rounded border px-3 py-2"
          >
            {props.trainers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name ?? tr.id}
              </option>
            ))}
          </select>
          {props.trainers.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("slotFirst.noTrainers")}</p>
          ) : null}

          {/* Month navigation — real links, so the proxy runs (F4.6). */}
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/zapisy/${props.groupTypeSlug}?m=${props.prevMonth}${trainerId ? `&trainerId=${trainerId}` : ""}`}
                scroll={false}
              >
                ← {t("calendar.prevMonth")}
              </Link>
            </Button>
            <span className="text-sm font-medium">{props.month}</span>
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/zapisy/${props.groupTypeSlug}?m=${props.nextMonth}${trainerId ? `&trainerId=${trainerId}` : ""}`}
                scroll={false}
              >
                {t("calendar.nextMonth")} →
              </Link>
            </Button>
          </div>

          {/* Step 2 — the slot. */}
          {!slot ? (
            days.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">{t("slotFirst.noSlots")}</p>
            ) : (
              <div className="space-y-4">
                {days.map(([dayKey, daySlots]) => (
                  <div key={dayKey}>
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      {formatDay(dayKey, locale)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {daySlots.map((s) => (
                        <Button
                          key={s.startsAt}
                          type="button"
                          variant="outline"
                          data-start-time={`${dayKey}T${s.startsAt}`}
                          onClick={() => setSlot(s)}
                        >
                          {s.startsAt}–{s.endsAt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      {/* Step 3 — confirm (OTP first for new parents). */}
      {slot && trainer ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {trainer.name ?? trainerId} · {formatDay(slot.dayKey, locale)} {slot.startsAt}–
              {slot.endsAt}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!verified ? (
              <VerifyStep
                onVerified={() => {
                  router.refresh();
                  setVerified(true);
                }}
              />
            ) : (
              <SlotFirstConfirmStep
                groupTypeSlug={props.groupTypeSlug}
                trainerId={trainerId}
                startTime={`${slot.dayKey}T${slot.startsAt}`}
                methods={props.methods}
                recognizedAthletes={props.recognized?.athletes ?? []}
                error={bookingResult?.error}
                policyDocument={props.policyDocument}
                consentDocuments={props.consentDocuments}
                requiresQualificationCard={props.requiresQualificationCard}
                onComplete={setBookingResult}
              />
            )}
            <Button variant="ghost" type="button" onClick={() => setSlot(null)}>
              ← {t("offer.chooseDate")}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

const slotFirstInitial: CreateSlotFirstState = {};

function SlotFirstConfirmStep({
  groupTypeSlug,
  trainerId,
  startTime,
  methods,
  recognizedAthletes,
  error,
  policyDocument,
  consentDocuments,
  requiresQualificationCard,
  onComplete,
}: {
  groupTypeSlug: string;
  trainerId: string;
  startTime: string;
  methods: PaymentMethodView[];
  recognizedAthletes: { id: string; name: string }[];
  error?: string;
  policyDocument: PolicyDocumentProp | null;
  consentDocuments: ConsentDocumentProp[];
  requiresQualificationCard: boolean;
  onComplete?: (state: CreateSlotFirstState) => void;
}) {
  const t = useTranslations("enrollment");
  const hasExisting = recognizedAthletes.length > 0;
  const enabledMethod = methods.find((m) => m.enabled)?.method ?? "on_site";

  const [state, formAction, pendingAction] = useActionState(
    createSlotFirstBookingAction,
    slotFirstInitial,
  );
  const [kind, setKind] = useState<"existing" | "new">(hasExisting ? "existing" : "new");
  const [athleteId, setAthleteId] = useState(recognizedAthletes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (onComplete && (state.success || state.error || state.checkoutUrl)) {
      onComplete(state);
    }
  }, [state, onComplete]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupTypeSlug" value={groupTypeSlug} />
      <input type="hidden" name="trainerId" value={trainerId} />
      <input type="hidden" name="startTime" value={startTime} />

      {/* The participant — one child, capacity 1 (§2.32). */}
      <fieldset className="space-y-3">
        <legend className="font-medium">{t("participant.heading")}</legend>
        {hasExisting ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="participantKind"
                value="existing"
                checked={kind === "existing"}
                onChange={() => setKind("existing")}
              />
              {t("participant.existing")}
            </label>
            {kind === "existing" ? (
              <select
                name="athleteId"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="border-input w-full rounded border px-3 py-2"
              >
                {recognizedAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="participantKind"
                value="new"
                checked={kind === "new"}
                onChange={() => setKind("new")}
              />
              {t("participant.addNew")}
            </label>
          </div>
        ) : (
          <input type="hidden" name="participantKind" value="new" />
        )}
        {kind === "new" ? (
          <div className="space-y-2">
            <FormField label={t("participant.name")} htmlFor="ll-sf-name">
              <Input
                id="ll-sf-name"
                name="participantName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label={t("participant.age")} htmlFor="ll-sf-age">
              <Input
                id="ll-sf-age"
                name="participantAge"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </FormField>
          </div>
        ) : null}
      </fieldset>

      {/* Payment method — same policy matrix as schedule-first (Constraint 7). */}
      <fieldset className="space-y-2">
        <legend className="font-medium">{t("payment.heading")}</legend>
        {methods.map((m) => (
          <label key={m.method} className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMethod"
              value={m.method}
              defaultChecked={m.method === enabledMethod}
              disabled={!m.enabled}
            />
            <span className={m.enabled ? "" : "text-muted-foreground"}>
              {m.method === "on_site" ? t("payment.onSite") : t("payment.online")}
              {!m.enabled ? ` — ${t("payment.onlineUnavailable")}` : ""}
            </span>
          </label>
        ))}
      </fieldset>

      {consentDocuments.length > 0 ? (
        <fieldset className="space-y-3 rounded border p-3">
          <legend className="font-medium">{t("consent.heading")}</legend>
          <p className="text-muted-foreground text-sm">{t("consent.mustAccept")}</p>
          <input type="hidden" name="consentCount" value={consentDocuments.length} />
          {consentDocuments.map((doc, di) => (
            <div key={doc.id} className="space-y-2">
              <input type="hidden" name={`consentDocId.${di}`} value={doc.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name={`consentGranted.${doc.id}.0`} required />
                <span>{t("consent.acceptLabel", { name: doc.name, version: doc.version })}</span>
              </label>
            </div>
          ))}
        </fieldset>
      ) : null}

      {policyDocument ? (
        <fieldset className="space-y-2">
          <legend className="font-medium">{t("policy.heading")}</legend>
          {policyDocument.requireReacceptance ? (
            <p className="text-muted-foreground text-sm">{t("policy.updatedInfo")}</p>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="acceptedPolicy"
              value={String(policyDocument.version)}
              required
            />
            <span>
              {t("policy.acceptLabel", {
                name: policyDocument.name,
                version: policyDocument.version,
              })}
            </span>
          </label>
          <ViewDocumentLink fileId={policyDocument.fileId} />
          <input type="hidden" name="acceptedPolicyVersion" value={policyDocument.version} />
        </fieldset>
      ) : null}

      {requiresQualificationCard ? (
        <fieldset className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
          <legend className="font-medium text-amber-800">{t("qualificationCard.heading")}</legend>
          <p className="text-sm text-amber-700">{t("qualificationCard.requiredNotice")}</p>
          <p className="text-sm text-amber-700">
            {t("qualificationCard.fillLink")}{" "}
            <Link href={`/karta/${groupTypeSlug}`} className="font-medium underline">
              {t("qualificationCard.goToForm")}
            </Link>
          </p>
        </fieldset>
      ) : null}

      {state.error || error ? <FieldError>{state.error || error}</FieldError> : null}
      <Button type="submit" disabled={pendingAction}>
        {pendingAction ? t("confirm.booking") : t("confirm.submit")}
      </Button>
    </form>
  );
}

/** `YYYY-MM-DD` → a readable local-day label in the visitor's locale. */
function formatDay(dayKey: string, locale: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)));
}
