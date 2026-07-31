/**
 * The client-facing notification-settings catalog (Faza 6, EPIK 44).
 *
 * The page renders one switch per row, grouped into the four thematic sections
 * from the phase-06 spec. Each row maps 1:1 to a `notification_event_type`
 * code; the switch toggles every channel of that event type on/off.
 *
 * NOTE the deliberate overlap: "Potwierdzenie zapisu" (Rezerwacje) and "Lekcja
 * indywidualna — potwierdzona" (Wnioski) both bind to `booking-confirmed` — the
 * slot-first booking confirmation IS the same event for both. The spec lists
 * them as separate rows; both switches therefore drive the same preference row,
 * which is why the save loop iterates a DEDUPED code list.
 *
 * Codes without an emitting flow yet (`invoice-available`,
 * `individual-session-rejected`, `qualification-card-reminder`) are RESERVED:
 * their templates and i18n exist, so the row stays stable when emission lands.
 */
export const CLIENT_NOTIFICATION_CATEGORIES = [
  {
    key: "bookings",
    eventTypes: [
      "session-reminder",
      "session-rescheduled",
      "session-cancelled",
      "booking-confirmed",
    ],
  },
  {
    key: "payments",
    eventTypes: ["credit-expiring-soon", "subscription-confirmed", "invoice-available"],
  },
  {
    key: "requests",
    eventTypes: [
      "group-change-approved",
      "group-change-rejected",
      "booking-confirmed",
      "individual-session-rejected",
    ],
  },
  {
    key: "cards",
    eventTypes: ["qualification-card-reminder"],
  },
] as const;

export type ClientNotificationCategoryKey = (typeof CLIENT_NOTIFICATION_CATEGORIES)[number]["key"];

/** Every event type the client page lets a parent switch, deduplicated. */
export const CLIENT_PREFERENCE_EVENT_TYPES: readonly string[] = [
  ...new Set(
    CLIENT_NOTIFICATION_CATEGORIES.flatMap((category) => [...category.eventTypes]),
  ),
];
