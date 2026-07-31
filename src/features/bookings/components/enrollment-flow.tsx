"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@/components/ui";
import type { CalendarDay, CalendarSlot } from "../calendar";
import type { PaymentOptionsView, PackageTeaser } from "../payment-options";
import { createBookingManyAction, type CreateBookingManyState } from "../actions";
import { EnrollmentSteps } from "./enrollment-steps";

type Recognized = {
  email: string;
  name: string | null;
  athletes: { id: string; name: string }[];
};

export type { Recognized as EnrollmentRecognized };

export interface ConsentDocumentProp {
  id: string;
  name: string;
  version: number;
  fileId: string | null;
}

export interface PolicyDocumentProp {
  id: string;
  name: string;
  version: number;
  fileId: string;
  requireReacceptance: boolean;
}
export interface EnrollmentFlowProps {
  groupTypeSlug: string;
  groupTypeName: string;
  price: number;
  discountedPrice?: number;
  currency: string;
  isNewClientOnly: boolean;
  requiresQualificationCard: boolean;
  paymentView: PaymentOptionsView;
  month: string;
  prevMonth: string;
  nextMonth: string;
  grid: CalendarDay[];
  recognized: Recognized | null;
  policyDocument: PolicyDocumentProp | null;
  consentDocuments: ConsentDocumentProp[];
}

/**
 * The single-route enrollment step machine (F5, EPIK 4).
 *
 * One client component, NO server-driven navigation between steps: a Server Action
 * redirect between segment routes is the F4.6 trap (the target renders without the
 * locale prefix or tenant header). Month navigation is the exception — those are
 * real `<Link>` requests (`?m=`), so the proxy runs and the header is correct.
 */
export function EnrollmentFlow(props: EnrollmentFlowProps) {
  const t = useTranslations("enrollment");
  const locale = useLocale();

  const money = (minor: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: props.currency }).format(
      minor / 100,
    );

  // Offers that cannot be booked render their message and stop — no calendar,
  // no submit (US-4.4/AC4, decision F; US-23.4/AC1, F12e).
  if (props.paymentView.kind === "no_packages_available") {
    return <Notice>{t("payment.noPackagesAvailable")}</Notice>;
  }
  if (props.paymentView.kind === "none_available") {
    return <Notice>{t("payment.noneAvailable")}</Notice>;
  }

  // Packages-only: show available packages inline (Faza 19).
  if (props.paymentView.kind === "packages_available") {
    return (
      <PackageSection
        packages={props.paymentView.packages}
        money={money}
        groupTypeSlug={props.groupTypeSlug}
      />
    );
  }

  // Mixed-mode: show both single-class calendar and packages (Faza 19).
  if (props.paymentView.kind === "mixed_mode") {
    return (
      <div className="mt-6 space-y-8">
        <PackageSection
          packages={props.paymentView.packages}
          money={money}
          groupTypeSlug={props.groupTypeSlug}
        />
        <div className="border-t pt-6">
          <Bookable {...props} money={money} />
        </div>
      </div>
    );
  }

  return <Bookable {...props} money={money} />;
}

function Bookable({
  groupTypeSlug,
  price,
  discountedPrice,
  isNewClientOnly,
  requiresQualificationCard,
  paymentView,
  month,
  prevMonth,
  nextMonth,
  grid,
  recognized,
  policyDocument,
  consentDocuments,
  money,
}: EnrollmentFlowProps & { money: (minor: number) => string }) {
  const t = useTranslations("enrollment");
  const router = useRouter();
  const methods = paymentView.kind === "options" ? paymentView.methods : [];

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<CalendarSlot | null>(null);
  // A parent with a live cookie is recognised: skip email + OTP entirely.
  const [verified, setVerified] = useState<boolean>(recognized !== null);
  const [bookingResult, setBookingResult] = useState<CreateBookingManyState | null>(null);

  const daySlots =
    grid.find((d) => d.dayKey === selectedDay)?.slots.filter((s) => s.bookable) ?? [];

  if (bookingResult?.success) {
    return <SuccessStep message={bookingResult.success} />;
  }

  if (bookingResult?.error) {
    // error is shown in ConfirmStep via state propagation
  }

  return (
    <div className="mt-6 space-y-6">
      <EnrollmentSteps
        current={!slot ? 1 : verified ? 3 : 2}
        labels={[t("steps.schedule"), t("steps.details"), t("steps.confirm")]}
      />

      <p className="text-lg font-medium">
        {discountedPrice != null && discountedPrice !== price ? (
          <>
            <span className="text-muted-foreground line-through mr-2">
              {t("offer.price", { price: money(price) })}
            </span>
            <span className="text-green-700">{money(discountedPrice)}</span>
          </>
        ) : (
          t("offer.price", { price: money(price) })
        )}
      </p>
      {isNewClientOnly ? <Badge variant="outline">{t("offer.newClientOnly")}</Badge> : null}

      {/* Step 2/3 — the calendar and the day's slots. */}
      {!slot ? (
        <Calendar
          month={month}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          groupTypeSlug={groupTypeSlug}
          grid={grid}
          selectedDay={selectedDay}
          onPickDay={setSelectedDay}
          daySlots={daySlots}
          onPickSlot={setSlot}
        />
      ) : null}

      {/* Once a slot is chosen: recognised parents go straight to confirm; new
          ones verify by OTP first, then confirm. */}
      {slot ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {slot.startsAt}–{slot.endsAt}
              {slot.locationName ? ` · ${slot.locationName}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!verified ? (
              <VerifyStep
                onVerified={() => {
                  // A real request — the proxy runs and the cookie is now present,
                  // so the server re-render can recognise the parent (F4.6 fix, like
                  // loginToAcademy's explicit post-login navigation).
                  router.refresh();
                  setVerified(true);
                }}
              />
            ) : (
              <ConfirmStep
                pending={false}
                groupTypeSlug={groupTypeSlug}
                sessionId={slot.sessionId}
                methods={methods}
                recognizedAthletes={recognized?.athletes ?? []}
                error={bookingResult?.error}
                policyDocument={policyDocument}
                consentDocuments={consentDocuments}
                requiresQualificationCard={requiresQualificationCard}
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

/**
 * The booking confirmation screen with an optional, skippable password-set
 * section (langlion spec v19, EPIK 44 US-44.1, Faza 29a).
 *
 * ─── SECURITY MODEL ──────────────────────────────────────────────────────────
 *
 * This component renderuje the password proposal for ANY client who reached the
 * booking confirmation screen, including recognised clients who skipped the OTP
 * step (US-4.2, US-44.1/AC2). The recognised path is safe because:
 *
 * 1. Today the ONLY path to a valid client_session is successful OTP
 *    verification (`/api/client-auth/verify` → `consumeOtp` →
 *    `markClientVerified` → `createClientSession`). The session is created
 *    AFTER isVerified=true, inside the same transaction.
 * 2. The backend endpoint (`POST /api/client-auth/password`) re-checks
 *    `isVerified` explicitly (defense-in-depth), so even if a future code
 *    path adds sessions without OTP, the password gate stays closed.
 *
 * If you introduce a new way to create `client_session` without OTP
 * verification (e.g. staff impersonation, magic link), you MUST add an
 * explicit `isVerified` gate at that path OR add the same defense to every
 * endpoint that trusts session == identity.
 */
export function SuccessStep({ message }: { message: string }) {
  const t = useTranslations("enrollment");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);

  async function submit() {
    setError("");

    if (password !== confirm) {
      setError(t("password.errors.mismatch"));
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(t("password.errors.weak"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setBusy(false);

      if (res.status === 422) {
        setError(t("password.errors.weak"));
        return;
      }

      if (!res.ok) {
        setError(t("password.errors.generic"));
        return;
      }

      setDone(true);
    } catch {
      setBusy(false);
      setError(t("password.errors.generic"));
    }
  }

  return (
    <Notice>
      {message}
      {!show ? (
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setShow(true)}>
            {t("password.heading")}
          </Button>
        </div>
      ) : done ? (
        <p className="mt-3 text-sm text-green-700">{t("password.success")}</p>
      ) : (
        <div className="mt-4 space-y-3 rounded border p-3">
          <h3 className="font-medium">{t("password.heading")}</h3>
          <p className="text-muted-foreground text-sm">{t("password.description")}</p>
          <FormField label={t("password.label")} htmlFor="ll-pw">
            <Input
              id="ll-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <FormField label={t("password.confirmLabel")} htmlFor="ll-pw-confirm">
            <Input
              id="ll-pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </FormField>
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={submit} disabled={busy || !password}>
              {busy ? t("password.saving") : t("password.submit")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShow(false)}>
              {t("password.skip")}
            </Button>
          </div>
        </div>
      )}
    </Notice>
  );
}

function Calendar({
  month,
  prevMonth,
  nextMonth,
  groupTypeSlug,
  grid,
  selectedDay,
  onPickDay,
  daySlots,
  onPickSlot,
}: {
  month: string;
  prevMonth: string;
  nextMonth: string;
  groupTypeSlug: string;
  grid: CalendarDay[];
  selectedDay: string | null;
  onPickDay: (day: string) => void;
  daySlots: CalendarSlot[];
  onPickSlot: (slot: CalendarSlot) => void;
}) {
  const t = useTranslations("enrollment");
  const weekdays = t("calendar.weekdays").split(" ");
  const empty = grid.every((d) => d.slots.length === 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          {/* Real navigation, so the proxy sets the tenant header and locale. */}
          <Link href={`/zapisy/${groupTypeSlug}?m=${prevMonth}`} scroll={false}>
            ← {t("calendar.prevMonth")}
          </Link>
        </Button>
        <CardTitle>{month}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/zapisy/${groupTypeSlug}?m=${nextMonth}`} scroll={false}>
            {t("calendar.nextMonth")} →
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-muted-foreground py-4 text-center">{t("calendar.noSessions")}</p>
        ) : null}
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {weekdays.map((w) => (
            <div key={w} className="text-muted-foreground py-1 font-medium">
              {w}
            </div>
          ))}
          {grid.map((cell, i) => (
            <button
              key={cell.dayKey ?? `blank-${i}`}
              type="button"
              data-day-key={cell.dayKey ?? undefined}
              data-bookable={cell.hasBookableSlot ? "true" : undefined}
              disabled={!cell.dayKey || cell.slots.length === 0}
              aria-pressed={selectedDay === cell.dayKey}
              onClick={() => cell.dayKey && onPickDay(cell.dayKey)}
              className={cellClass(cell, selectedDay)}
            >
              {cell.dayOfMonth ?? ""}
              {cell.dayKey && cell.slots.length > 0 && !cell.hasBookableSlot ? (
                <span className="block text-[10px]">{t("calendar.full")}</span>
              ) : null}
            </button>
          ))}
        </div>

        {selectedDay && daySlots.length > 0 ? (
          <div className="mt-4 space-y-2">
            {daySlots.map((s) => (
              <Button
                key={s.sessionId}
                type="button"
                variant="outline"
                data-session-id={s.sessionId}
                className="w-full justify-between"
                onClick={() => onPickSlot(s)}
              >
                <span>
                  {s.startsAt}–{s.endsAt}
                  {s.locationName ? ` · ${s.locationName}` : ""}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("slot.free", { free: s.freeSeats, capacity: s.capacity })}
                </span>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function cellClass(cell: CalendarDay, selectedDay: string | null): string {
  const base = "aspect-square rounded p-1 text-sm";
  if (!cell.dayKey) return `${base} invisible`;
  if (cell.slots.length === 0) return `${base} text-muted-foreground/40`;
  if (!cell.hasBookableSlot) return `${base} text-muted-foreground line-through`;
  const selected =
    selectedDay === cell.dayKey
      ? "bg-primary text-primary-foreground"
      : "bg-muted hover:bg-muted/70";
  return `${base} font-medium ${selected}`;
}

export function VerifyStep({ onVerified }: { onVerified: () => void }) {
  const t = useTranslations("enrollment");
  const [phase, setPhase] = useState<"contact" | "otp">("contact");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/client-auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, phone: phone || undefined }),
    });
    setBusy(false);
    if (res.status === 429) return setError(t("otp.rateLimited"));
    if (!res.ok) return setError(t("errors.generic"));
    setPhase("otp");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/client-auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setBusy(false);
    if (res.status === 429) return setError(t("otp.rateLimited"));
    if (!res.ok) return setError(t("otp.invalid"));
    onVerified();
  }

  if (phase === "contact") {
    return (
      <div className="space-y-3">
        <h3 className="font-medium">{t("contact.heading")}</h3>
        <FormField label={t("contact.email")} htmlFor="ll-email">
          <Input
            id="ll-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label={t("contact.name")} htmlFor="ll-name">
          <Input id="ll-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label={t("contact.phone")} htmlFor="ll-phone">
          <Input id="ll-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="button" onClick={requestCode} disabled={busy || !email}>
          {busy ? t("contact.sending") : t("contact.submit")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{t("otp.heading")}</h3>
      <p className="text-muted-foreground text-sm">{t("otp.prompt", { email })}</p>
      <FormField label={t("otp.code")} htmlFor="ll-code">
        <Input
          id="ll-code"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </FormField>
      {error ? <FieldError>{error}</FieldError> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={verify} disabled={busy || code.length !== 6}>
          {busy ? t("otp.verifying") : t("otp.submit")}
        </Button>
        <Button type="button" variant="ghost" onClick={requestCode} disabled={busy}>
          {t("otp.resend")}
        </Button>
      </div>
    </div>
  );
}

const participantsInitial: CreateBookingManyState = {};

function ConfirmStep({
  pending,
  groupTypeSlug,
  sessionId,
  methods,
  recognizedAthletes,
  error,
  policyDocument,
  consentDocuments,
  requiresQualificationCard,
  onComplete,
}: {
  pending: boolean;
  groupTypeSlug: string;
  sessionId: string;
  methods: { method: "online" | "on_site"; enabled: boolean }[];
  recognizedAthletes: { id: string; name: string }[];
  error?: string;
  policyDocument: PolicyDocumentProp | null;
  consentDocuments: ConsentDocumentProp[];
  requiresQualificationCard: boolean;
  onComplete?: (state: CreateBookingManyState) => void;
}) {
  const t = useTranslations("enrollment");
  const hasExisting = recognizedAthletes.length > 0;
  const enabledMethod = methods.find((m) => m.enabled)?.method ?? "on_site";

  const [state, formAction, pendingAction] = useActionState(
    createBookingManyAction,
    participantsInitial,
  );
  const [children, setChildren] = useState([{ kind: hasExisting ? "existing" as const : "new" as const, athleteId: recognizedAthletes[0]?.id ?? "", name: "", age: "" }]);

  useEffect(() => {
    if (onComplete && (state.success || state.error)) onComplete(state);
  }, [state, onComplete]);

  function addChild() {
    setChildren((prev) => [...prev, { kind: "new", athleteId: "", name: "", age: "" }]);
  }

  function removeChild(index: number) {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  function updateChild(index: number, patch: Partial<typeof children[number]>) {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupTypeSlug" value={groupTypeSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="participantCount" value={children.length} />

      <fieldset className="space-y-4">
        <legend className="font-medium">{t("multiChild.heading")}</legend>
        {children.map((child, index) => (
          <div key={index} className="space-y-2 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("multiChild.childLabel", { n: index + 1 })}
              </span>
              {children.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="text-destructive text-sm"
                >
                  {t("multiChild.remove")}
                </button>
              ) : null}
            </div>

            {hasExisting ? (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`participantKind.${index}`}
                    value="existing"
                    checked={child.kind === "existing"}
                    onChange={() => updateChild(index, { kind: "existing" })}
                  />
                  {t("participant.existing")}
                </label>
                {child.kind === "existing" ? (
                  <select
                    name={`athleteId.${index}`}
                    value={child.athleteId}
                    onChange={(e) => updateChild(index, { athleteId: e.target.value })}
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
                    name={`participantKind.${index}`}
                    value="new"
                    checked={child.kind === "new"}
                    onChange={() => updateChild(index, { kind: "new" })}
                  />
                  {t("participant.addNew")}
                </label>
              </>
            ) : (
              <input type="hidden" name={`participantKind.${index}`} value="new" />
            )}
            {child.kind === "new" ? (
              <div className="space-y-2">
                <FormField label={t("participant.name")} htmlFor={`ll-name-${index}`}>
                  <Input
                    id={`ll-name-${index}`}
                    name={`participantName.${index}`}
                    value={child.name}
                    onChange={(e) => updateChild(index, { name: e.target.value })}
                  />
                </FormField>
                <FormField label={t("participant.age")} htmlFor={`ll-age-${index}`}>
                  <Input
                    id={`ll-age-${index}`}
                    name={`participantAge.${index}`}
                    inputMode="numeric"
                    value={child.age}
                    onChange={(e) => updateChild(index, { age: e.target.value })}
                  />
                </FormField>
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addChild}>
          + {t("multiChild.addAnother")}
        </Button>
      </fieldset>

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
              {children.map((child, ci) => (
                <label key={`${doc.id}-${ci}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`consentGranted.${doc.id}.${ci}`}
                    required
                  />
                  <span>
                    {t("consent.acceptLabel", { name: doc.name, version: doc.version })}
                    {children.length > 1 ? ` — ${t("multiChild.childLabel", { n: ci + 1 })}` : ""}
                  </span>
                </label>
              ))}
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
        <fieldset className="space-y-2 rounded border p-3 border-amber-200 bg-amber-50">
          <legend className="font-medium text-amber-800">{t("qualificationCard.heading")}</legend>
          <p className="text-sm text-amber-700">{t("qualificationCard.requiredNotice")}</p>
          <p className="text-sm text-amber-700">
            {t("qualificationCard.fillLink")}{" "}
            <Link href={`/karta/${groupTypeSlug}`} className="underline font-medium">
              {t("qualificationCard.goToForm")}
            </Link>
          </p>
        </fieldset>
      ) : null}

      {state.error || error ? <FieldError>{state.error || error}</FieldError> : null}
      <Button type="submit" disabled={pendingAction || pending}>
        {pendingAction || pending ? t("confirm.booking") : t("confirm.submit")}
      </Button>
    </form>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="mt-6">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function PackageSection({
  packages,
  money,
  groupTypeSlug,
}: {
  packages: PackageTeaser[];
  money: (minor: number) => string;
  groupTypeSlug: string;
}) {
  const t = useTranslations("enrollment");
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{t("payment.packages")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <CardTitle>{pkg.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold">{money(pkg.price)}</p>
              <p className="text-muted-foreground text-sm">
                {t("payment.creditsCount", { count: pkg.creditQuantity })}
                &nbsp;·&nbsp;
                {pkg.billingType === "one_time" ? t("payment.oneTime") : t("payment.recurring")}
              </p>
              <Button asChild className="w-full">
                <Link href={`/zapisy/${groupTypeSlug}/purchase/${pkg.id}`}>
                  {t("payment.buyPackage")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-sm">{children}</p>;
}

export function ViewDocumentLink({ fileId }: { fileId: string }) {
  const t = useTranslations("enrollment");
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/policies/file/${fileId}`);
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={open}
      className="text-primary text-sm underline underline-offset-2 disabled:opacity-50"
    >
      {t("policy.viewDocument")}
    </button>
  );
}
