import type { TemplateName } from "@/lib/adapters/email";

/**
 * Email categories and the template → category map (spec 10.3).
 *
 * Lives in the feature, not in the adapter's contract: a category is product
 * policy about who may opt out of what, not a capability of any provider. The
 * adapter stays dumb transport.
 *
 * "transactional" is UNSUPPRESSIBLE, and it is unsuppressible by CONSTRUCTION
 * rather than by a runtime check: `SuppressibleCategory` excludes it, so
 * `email_suppression.category` cannot hold it and `isSuppressed` cannot be asked
 * about it. You cannot opt out of a password reset — the user asked for it thirty
 * seconds ago, and an opt-out that silences it is a lockout, not a preference.
 */

export type EmailCategory = "transactional" | "onboarding" | "product";

/**
 * What an opt-out row may target. `"all"` is the sentinel a one-click
 * unsubscribe writes (RFC 8058 gives no category to scope by).
 */
export type SuppressibleCategory = Exclude<EmailCategory, "transactional"> | "all";

export const SUPPRESSIBLE_CATEGORIES: readonly SuppressibleCategory[] = [
  "onboarding",
  "product",
  "all",
] as const;

export function isSuppressibleCategory(value: string): value is SuppressibleCategory {
  return (SUPPRESSIBLE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Exhaustive by construction: `Record<TemplateName, _>` makes adding a template
 * without classifying it a COMPILE ERROR rather than a code-review finding. The
 * type is the enforcement; this comment is only the explanation.
 *
 * `welcome` is onboarding, not transactional: spec 10.3 makes day-0 welcome step
 * one of the sequence, and every onboarding email must carry an unsubscribe link.
 */
export const TEMPLATE_CATEGORY: Record<TemplateName, EmailCategory> = {
  "verify-email": "transactional",
  "password-reset": "transactional",
  invitation: "transactional",
  "payment-failed": "transactional",
  "subscription-confirmed": "transactional",
  // Unsuppressible by construction, and this is the clearest case in the map: the
  // parent asked for it seconds ago, and an opt-out that silenced it would be a
  // lockout with no other way in — parents have no password to fall back on.
  "client-otp": "transactional",
  welcome: "onboarding",
  "onboarding-tips": "onboarding",
  "onboarding-features": "onboarding",
  // E-mail-first by decision (Rozstrzygnięcie #3, plan Faza 6): a parent cannot
  // opt out of being told their child received a grade/note, the same reasoning
  // as `client-otp` — there is no other channel to fall back to (F13 hasn't
  // built the client panel view yet).
  "grade-recorded": "transactional",
  "progress-note-added": "transactional",
  // Faza 7 — anulowanie rezerwacji i sesji. Unsuppressible: klient musi wiedzieć,
  // że jego zajęcia zostały odwołane, zwłaszcza gdy przyznano kredyt (US-19.2/AC3).
  "booking-cancelled": "transactional",
  "session-cancelled": "transactional",
  // F9 / EPIK 29 — plan limit notifications (email-only, transactional).
  "plan_limit_approaching": "transactional",
  "plan_limit_reached": "transactional",
  "subscription-payment-failed": "transactional",
  // Faza 15 — Group swap notifications. Transactional: klient musi wiedzieć
  // o zmianie/zatwierdzeniu/odrzuceniu wniosku o zmianę grupy.
  "group-change-approved": "transactional",
  "group-change-rejected": "transactional",
  "group-change-pending-payment": "transactional",
  "group-change-expired": "transactional",
  "group-change-cancelled": "transactional",
  "group-change-completed": "transactional",
  // Faza 15 — Credit transfer. Transactional: klient musi wiedzieć o zakończeniu
  // przeniesienia kredytu między dziećmi.
  "credit-transfer-completed": "transactional",
  // Faza 16 — Zwroty fiducjarne. Transactional: klient musi wiedzieć o zwrocie,
  // zwłaszcza gdy pieniądze wracają na konto. Unsuppressible per spec (seed).
  "refund-confirmed": "transactional",
  // Faza 28 — Tematy lekcji i prace domowe. Transactional: klient musi wiedzieć
  // o nowym temacie/zadaniu — ten sam wzorzec co grade-recorded (e-mail-first).
  "lesson-topic-added": "transactional",
  "homework-assigned": "transactional",
  // Faza 29a — Password changed. Security notification, is_overridable=false.
  "client-password-changed": "transactional",
  // Faza 5 — Slot-first individual sessions. Transactional: klient musi wiedzieć
  // o potwierdzeniu rezerwacji, a trener o nowej sesji.
  "booking-confirmed": "transactional",
  "slot-first-session-created": "transactional",
  // Faza 6 — Client notification settings (EPIK 44).
  // `session-reminder` is product (suppressible): przypomnienie jest miłe, nie
  // niezbędne — klient może je wyłączyć przez preferences.
  "session-reminder": "product",
  // Reszta jest transactional (unsuppressible email): o zmianie terminu, fakturze,
  // odrzuceniu lekcji i brakującej karcie klient musi wiedzieć.
  "session-rescheduled": "transactional",
  "invoice-available": "transactional",
  "individual-session-rejected": "transactional",
  "qualification-card-reminder": "transactional",
};

export function categoryFor(template: TemplateName): EmailCategory {
  return TEMPLATE_CATEGORY[template];
}
