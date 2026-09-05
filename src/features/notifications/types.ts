export const NOTIFICATION_TYPES = [
  "verify-email",
  "invitation",
  "payment-failed",
  "subscription-confirmed",
  "plan_limit_approaching",
  "plan_limit_reached",
  "grade-recorded",
  "progress-note-added",
  "booking-cancelled",
  "session-cancelled",
  "subscription-payment-failed",
  "client-otp",
  "password-reset",
  "stripe_connect_requires_attention",
  "refund-confirmed",
  "credit-expiring-soon",
  "group-change-approved",
  "client-password-changed",
  // ── Faza 15 — Group swap (EPIK 11) ──────────────────────────────────
  "group-change-submitted",       // do admina — nowy wniosek
  "group-change-rejected",        // do klienta — wniosek odrzucony
  "group-change-pending-payment", // do klienta — oczekuje na dopłatę
  "group-change-expired",         // do klienta — wygasł przez brak płatności
  "group-change-cancelled",       // do klienta — anulowany przez admina
  "group-change-completed",       // do klienta — swap zakończony
  // ── Faza 15 — Credit transfer (US-7.5) ──────────────────────────────
  "credit-transfer-submitted",    // do admina — nowy wniosek o przeniesienie
  "credit-transfer-completed",    // do klienta — przeniesienie zakończone
  // ── Faza 28 — Lesson topics and homework (EPIK 43, §2.42) ───────────
  "lesson_topic_added",           // do klienta — nowy temat lekcji
  "homework_assigned",            // do klienta — nowa praca domowa
  // ── Faza 5 — Slot-first individual sessions (EPIK 34, §2.32) ─────────
  "booking-confirmed",            // do klienta — potwierdzenie rezerwacji
  "slot-first-session-created",   // do trenera — nowa sesja przypisana
  // ── Faza 6 — Client notification settings (EPIK 44) ───────────────────
  "session-reminder",             // do klienta — przypomnienie o nadchodzących zajęciach
  "session-rescheduled",          // do klienta — zmiana terminu zajęć
  "invoice-available",            // do klienta — faktura dostępna (reserved)
  "individual-session-rejected",  // do klienta — lekcja indywidualna odrzucona (reserved)
  "qualification-card-reminder",  // do klienta — brakująca karta kwalifikacyjna (reserved)
  // ── Faza 5.3 — Connect webhook retry monitoring ───────────────────────
  "webhook-dead-lettered",        // do admina — webhook Stripe padł po 3 próbach
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_META: Record<NotificationType, { suppressible: boolean }> = {
  "verify-email": { suppressible: true },
  invitation: { suppressible: true },
  "payment-failed": { suppressible: true },
  "subscription-confirmed": { suppressible: true },
  "plan_limit_approaching": { suppressible: false },
  "plan_limit_reached": { suppressible: false },
  "grade-recorded": { suppressible: true },
  "progress-note-added": { suppressible: true },
  "booking-cancelled": { suppressible: true },
  "session-cancelled": { suppressible: true },
  "subscription-payment-failed": { suppressible: false },
  "client-otp": { suppressible: false },
  "password-reset": { suppressible: true },
  "stripe_connect_requires_attention": { suppressible: false },
  "refund-confirmed": { suppressible: false },
  "credit-expiring-soon": { suppressible: true },
  "group-change-approved": { suppressible: true },
  "client-password-changed": { suppressible: false },
  "group-change-submitted": { suppressible: false },
  "group-change-rejected": { suppressible: true },
  "group-change-pending-payment": { suppressible: false },
  "group-change-expired": { suppressible: true },
  "group-change-cancelled": { suppressible: true },
  "group-change-completed": { suppressible: true },
  "credit-transfer-submitted": { suppressible: false },
  "credit-transfer-completed": { suppressible: true },
  "lesson_topic_added": { suppressible: true },
  "homework_assigned": { suppressible: true },
  "booking-confirmed": { suppressible: true },
  "slot-first-session-created": { suppressible: true },
  "session-reminder": { suppressible: true },
  "session-rescheduled": { suppressible: true },
  "invoice-available": { suppressible: true },
  "individual-session-rejected": { suppressible: true },
  "qualification-card-reminder": { suppressible: true },
  "webhook-dead-lettered": { suppressible: false },
};

export function isNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_META;
}

export function isSuppressibleType(type: string): boolean {
  return type in NOTIFICATION_META ? NOTIFICATION_META[type as NotificationType].suppressible : true;
}
