import type { Locale } from "@/lib/i18n/config";

/**
 * Email provider contract (spec 1.2, 10.1 — pluggable transactional email).
 *
 * Feature code depends ONLY on this interface and the `TemplateName` union.
 * Concrete adapters (log/dev, Resend, …) live beside this file and are chosen by
 * the factory in `./index.ts`. No provider SDK is imported here.
 *
 * This adapter is DUMB TRANSPORT. It renders and delivers. It knows nothing about
 * categories, unsubscribe preferences, or tokens — that is `features/emails`,
 * because those are product policy, not provider capability. The one delivery
 * path in the app is the `email.send` job handler (spec 12); feature code calls
 * `enqueueEmail`, never `send` directly, which is what keeps retry and suppression
 * in one file each instead of eight.
 */

/** Every template the app can send (spec 10.2). */
export type TemplateName =
  // Transactional — always delivered; never suppressible.
  | "verify-email"
  | "password-reset"
  | "invitation"
  | "payment-failed"
  | "subscription-confirmed"
  /** The parent's one-time sign-in code (langlion §2.19, US-4.5). */
  | "client-otp"
  // Onboarding sequence (spec 10.3) — carries an unsubscribe link.
  | "welcome"
  | "onboarding-tips"
  | "onboarding-features"
  // E-dziennik (langlion §2.33, EPIK 35, v16, Faza 6) — e-mail-first client
  // notification, Rozstrzygnięcie #3. Unsuppressible: see categories.ts.
  | "grade-recorded"
  | "progress-note-added"
  // Anulowanie rezerwacji i sesji (langlion EPIK 12, US-19.2, Faza 7).
  //
  // `booking-cancelled` — potwierdzenie anulowania pojedynczej rezerwacji.
  // `session-cancelled` — cała sesja odwołana przez admina (US-19.2/AC3).
  | "booking-cancelled"
  | "session-cancelled"
  // F9 / EPIK 29 — Plan limits (email-only, not suppressible in-app).
  | "plan_limit_approaching"
  | "plan_limit_reached"
  // F12d — Client subscription payment failure notification. Differs from
  // "payment-failed" (platform plan billing): this one targets the parent
  // (client), not the academy admin. `portalUrl` is optional — absent when
  // the academy has not configured a Stripe Customer Portal.
  | "subscription-payment-failed"
  // Faza 15 — Group swap (EPIK 11)
  | "group-change-approved"
  | "group-change-rejected"
  | "group-change-pending-payment"
  | "group-change-expired"
  | "group-change-cancelled"
  | "group-change-completed"
  // Faza 15 — Credit transfer (US-7.5)
  | "credit-transfer-completed"
  // Faza 16 — Zwroty fiducjarne (EPIK 18)
  | "refund-confirmed"
  // Faza 28 — Tematy lekcji i prace domowe (EPIK 43, §2.42)
  // E-mail-first client notification (Rozstrzygnięcie #3/24).
  | "lesson-topic-added"
  | "homework-assigned"
  // Faza 29a — Client password changed (EPIK 44, spec v19).
  // Security notification: NOT suppressible, fires on reset only (not initial set).
  | "client-password-changed"
  // Faza 5 — Slot-first individual sessions (EPIK 34, §2.32).
  // `booking-confirmed` — potwierdzenie utworzenia rezerwacji (klient).
  // `slot-first-session-created` — nowa sesja przypisana do trenera.
  | "booking-confirmed"
  | "slot-first-session-created"
  // Faza 6 — Client notification settings (EPIK 44).
  // `session-reminder` — przypomnienie o nadchodzących zajęciach (job).
  // `session-rescheduled` — zmiana terminu zajęć (rezerve, brak flow reschedule).
  // Pozostałe trzy są reserved (F27/faktury, slot-first rejection, przypomnienie
  // o karcie kwalifikacyjnej) — szablon + i18n istnieją, emisja dobudowana później.
  | "session-reminder"
  | "session-rescheduled"
  | "invoice-available"
  | "individual-session-rejected"
  | "qualification-card-reminder"
  // Faza 5.3 — Connect webhook dead-letter alert (staff). An event that failed
  // WEBHOOK_MAX_ATTEMPTS times is a bug in a handler, not a transient blip —
  // the org owner must be told their payment flow is broken. Unsuppressible.
  | "webhook-dead-lettered";
// `magic-link` lands with spec 2.2, which is not implemented yet.

/**
 * Per-template props.
 *
 * Typed per template rather than a loose bag: with eight templates and as many
 * trigger sites, `Record<string, unknown>` is how you ship a `payment-failed`
 * whose `orgName` is spelled `organizationName` with no compiler complaint.
 */
export interface TemplateProps {
  "verify-email": { url: string; name?: string | null };
  "password-reset": { url: string; name?: string | null };
  invitation: { url: string; orgName: string; inviterName: string; role: string };
  /**
   * `manageUrl` points at wherever the user deals with billing. Today that is an
   * in-app settings page; it becomes the provider-hosted customer portal link
   * once spec 5.5 lands, which changes the caller, not these templates.
   */
  "payment-failed": { orgName: string; amount: number; currency: string; manageUrl: string };
  "subscription-confirmed": { orgName: string; planName: string; manageUrl: string };
  /**
   * `code` is the RAW one-time code — the only place in the system it exists
   * outside the parent's browser, since only its hash is stored (see
   * `schema/client-otps.ts`). `expiresInMinutes` is passed rather than derived so
   * the message and `OTP_TTL_MS` cannot disagree about how long the parent has.
   */
  "client-otp": { code: string; orgName: string; expiresInMinutes: number };
  welcome: { name?: string | null; unsubscribeUrl: string };
  "onboarding-tips": { name?: string | null; unsubscribeUrl: string };
  "onboarding-features": { name?: string | null; unsubscribeUrl: string };
  /** No value/comment text in the mail (see template header) — just the fact. */
  "grade-recorded": { orgName: string; athleteName: string; fieldName: string };
  "progress-note-added": { orgName: string; athleteName: string };
  /**
   * Potwierdzenie anulowania rezerwacji przez klienta lub personel (F7, EPIK 12).
   * `creditInfo` obecne tylko gdy przyznano kredyt kompensacyjny.
   */
  "booking-cancelled": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    sessionDate: string;
    sessionTime: string;
    creditInfo?: string;
  };
  /**
   * Session cancelled by admin — sent to every parent whose booking was affected
   * (langlion US-19.2/AC3, Faza 7).
   */
  "session-cancelled": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    sessionDate: string;
    sessionTime: string;
    creditInfo?: string;
  };
  /**
   * F9 / EPIK 29 — Plan limit approaching (80% threshold, email-only).
   * Not suppressible in-app (not in notification_preference) — always delivered via email.
   */
  "plan_limit_approaching": {
    orgName: string;
    limitKey: string; // "max_students", "max_groups", etc.
    limitLabel: string; // human-readable label
    usage: number;
    limit: number;
    percentage: number; // e.g., 85
    upgradeUrl: string; // link to billing page
  };
  /**
   * F9 / EPIK 29 — Plan limit reached (100%, blocked operation, email-only).
   * Not suppressible in-app — always delivered via email.
   */
  "plan_limit_reached": {
    orgName: string;
    limitKey: string;
    limitLabel: string;
    usage: number;
    limit: number;
    upgradeUrl: string;
  };
  /**
   * F12d — Client subscription payment failure.
   * `portalUrl` is present only when the academy has the Stripe Customer Portal
   * configured. When absent, the template shows a "contact the academy" fallback.
   */
  "subscription-payment-failed": {
    orgName: string;
    portalUrl?: string;
  };
  // Faza 15 — Group swap (EPIK 11)
  "group-change-approved": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
  };
  "group-change-rejected": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
    reason: string;
  };
  "group-change-pending-payment": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
    amount: string;
    expiresAt: string;
  };
  "group-change-expired": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
  };
  "group-change-cancelled": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
    reason?: string;
  };
  "group-change-completed": {
    athleteName: string;
    sourceGroupName: string;
    targetGroupName: string;
  };
  // Faza 15 — Credit transfer (US-7.5)
  "credit-transfer-completed": {
    sourceAthleteName: string;
    targetAthleteName: string;
  };
  // Faza 16 — Zwroty fiducjarne (EPIK 18)
  "refund-confirmed": {
    refundAmount: string;
    refundVariant: string;
  };
  // Faza 28 — Tematy lekcji i prace domowe (EPIK 43, §2.42)
  "lesson-topic-added": { orgName: string; sessionDate: string };
  "homework-assigned": { orgName: string; sessionDate: string; description: string; dueDate?: string };
  // Faza 29a — Client password changed (EPIK 44, spec v19).
  // Security notification, is_overridable=false. Triggers only on reset (F29b),
  // not on initial set from the booking confirmation screen.
  "client-password-changed": { orgName: string };
  // Faza 5 — Slot-first individual sessions (EPIK 34, §2.32).
  "booking-confirmed": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    trainerName: string;
    sessionDate: string;
    sessionTime: string;
  };
  "slot-first-session-created": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    sessionDate: string;
    sessionTime: string;
  };
  // Faza 6 — Client notification settings (EPIK 44). These five all reach the
  // parent, so they share the "your booking" props; the reserved ones reuse the
  // same shape so their templates stay trivial to complete when emission lands.
  "session-reminder": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    sessionDate: string;
    sessionTime: string;
  };
  "session-rescheduled": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    sessionDate: string;
    sessionTime: string;
  };
  "invoice-available": { orgName: string; invoiceLabel: string };
  "individual-session-rejected": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
    trainerName: string;
    reason?: string;
  };
  "qualification-card-reminder": {
    orgName: string;
    athleteName: string;
    groupTypeName: string;
  };
  // Faza 5.3 — Connect webhook dead-letter alert (staff).
  // `eventId` is the Stripe event id, `eventType` the raw Connect type (e.g.
  // "checkout.session.completed"), `error` the last failure reason.
  "webhook-dead-lettered": {
    orgName: string;
    eventId: string;
    eventType: string;
    error: string;
  };
}

/** Loose payload shape for callers that resolve the template at runtime. */
export type TemplateData = Record<string, unknown>;

export interface Recipient {
  to: string;
  name?: string;
  /**
   * The language to write to this person in (spec 16.1).
   *
   * A property of the RECIPIENT, not of the message: you cannot address a human
   * without knowing what language they read, and the same template goes out in
   * different languages to different people.
   *
   * REQUIRED, not optional, and that is the whole point — it applies the
   * `indexable` precedent from lib/public-routes.ts. Optional would mean every
   * caller who forgets silently sends English to a Polish user, and nothing
   * anywhere records that it happened. Required makes "in what language?" a
   * question the compiler asks at each of the eight enqueue sites.
   */
  locale: Locale;
}

export interface SendOptions {
  /**
   * Extra RFC 5322 headers — `List-Unsubscribe` and friends (spec 10.3).
   *
   * The caller builds these because only it knows the template's category and can
   * mint the token. Spec 10.1 pins the signature as `send(template, dane,
   * odbiorca)`, so this stays an optional fourth parameter.
   */
  headers?: Record<string, string>;
}

/** A template rendered to the two bodies every mail client can consume. */
export interface RenderedEmail {
  subject: string;
  html: string;
  /** Plain-text fallback (spec 10.2). */
  text: string;
}

export interface EmailAdapter {
  /**
   * Render `template` with `data` and deliver it to `recipient`.
   *
   * IMPLEMENTATIONS MUST THROW ON DELIVERY FAILURE. Throwing is the ONLY way the
   * job queue learns to retry (§12.2): the handler's exception is what schedules
   * the backoff. An adapter that catches and logs instead converts a transient
   * provider outage into permanent, silent data loss — the user simply never gets
   * the email and nothing anywhere records that.
   */
  send(
    template: TemplateName,
    data: TemplateData,
    recipient: Recipient,
    options?: SendOptions,
  ): Promise<void>;
}
