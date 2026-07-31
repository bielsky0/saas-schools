import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import pl from "@/lib/i18n/messages/pl.json";
import {
  CLIENT_NOTIFICATION_CATEGORIES,
  CLIENT_PREFERENCE_EVENT_TYPES,
} from "./client-preference-types";
import { NOTIFICATION_TYPES } from "./types";

const typeSet = new Set(NOTIFICATION_TYPES);

describe("CLIENT_NOTIFICATION_CATEGORIES", () => {
  it("defines exactly the four spec sections in order", () => {
    expect(CLIENT_NOTIFICATION_CATEGORIES.map((c) => c.key)).toEqual([
      "bookings",
      "payments",
      "requests",
      "cards",
    ]);
  });

  it("groups the event types per spec (bookings)", () => {
    const bookings = CLIENT_NOTIFICATION_CATEGORIES.find((c) => c.key === "bookings")!;
    expect([...bookings.eventTypes]).toEqual([
      "session-reminder",
      "session-rescheduled",
      "session-cancelled",
      "booking-confirmed",
    ]);
  });

  it("groups the event types per spec (payments)", () => {
    const payments = CLIENT_NOTIFICATION_CATEGORIES.find((c) => c.key === "payments")!;
    expect([...payments.eventTypes]).toEqual([
      "credit-expiring-soon",
      "subscription-confirmed",
      "invoice-available",
    ]);
  });

  it("groups the event types per spec (requests)", () => {
    const requests = CLIENT_NOTIFICATION_CATEGORIES.find((c) => c.key === "requests")!;
    expect([...requests.eventTypes]).toEqual([
      "group-change-approved",
      "group-change-rejected",
      "booking-confirmed",
      "individual-session-rejected",
    ]);
  });

  it("groups the event types per spec (cards)", () => {
    const cards = CLIENT_NOTIFICATION_CATEGORIES.find((c) => c.key === "cards")!;
    expect([...cards.eventTypes]).toEqual(["qualification-card-reminder"]);
  });

  it("only references event types that exist in NOTIFICATION_TYPES", () => {
    const catalog = CLIENT_NOTIFICATION_CATEGORIES.flatMap((c) => [...c.eventTypes]);
    for (const eventType of catalog) {
      expect(typeSet.has(eventType), `unknown event type: ${eventType}`).toBe(true);
    }
  });
});

describe("CLIENT_PREFERENCE_EVENT_TYPES", () => {
  it("deduplicates booking-confirmed (bookings + requests)", () => {
    expect(CLIENT_PREFERENCE_EVENT_TYPES.filter((t) => t === "booking-confirmed")).toHaveLength(1);
  });

  it("covers every catalog entry exactly once", () => {
    const catalog = new Set(CLIENT_NOTIFICATION_CATEGORIES.flatMap((c) => [...c.eventTypes]));
    expect(new Set(CLIENT_PREFERENCE_EVENT_TYPES)).toEqual(catalog);
  });
});

describe("i18n completeness", () => {
  it.each(["en", "pl"] as const)("has a clientPreferences.types label for every catalog type (%s)", (locale) => {
    const messages = locale === "en" ? en : pl;
    const labels = messages.notifications.clientPreferences.types as Record<string, string>;
    for (const eventType of CLIENT_PREFERENCE_EVENT_TYPES) {
      expect(typeof labels[eventType], `missing label: ${eventType}`).toBe("string");
    }
  });

  it("has no orphan clientPreferences.types keys (every label maps to a catalog row)", () => {
    const catalog = new Set(CLIENT_PREFERENCE_EVENT_TYPES);
    for (const key of Object.keys(en.notifications.clientPreferences.types)) {
      expect(catalog.has(key), `orphan label: ${key}`).toBe(true);
    }
  });

  it.each(["en", "pl"] as const)("has a category label for each section (%s)", (locale) => {
    const messages = locale === "en" ? en : pl;
    const categories = messages.notifications.clientPreferences.categories as Record<string, string>;
    for (const category of CLIENT_NOTIFICATION_CATEGORIES) {
      expect(typeof categories[category.key], `missing category: ${category.key}`).toBe("string");
    }
  });
});
