import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { NamespaceTranslator } from "@/lib/i18n";
import { createSlotFirstBookingSchema } from "./schema";

/** A translator stub returning the key itself — the schema only compares keys. */
const t = ((key: string) => key) as unknown as NamespaceTranslator<"bookings.validation">;

/**
 * Faza 5 — slot-first enrollment (EPIK 34, §2.32).
 *
 * `createSlotFirstBookingSchema` extends the standard booking schema but drops
 * `sessionId`: the session does not exist yet, the parent picks a trainer and a
 * local wall-clock start time instead, and the booking action creates the
 * `class_session` on the fly. The base schema's required `sessionId` must NOT
 * leak into this shape, or every submission would fail validation.
 */

function validInput() {
  return {
    groupTypeSlug: "individual",
    trainerId: "trainer-1",
    startTime: "2026-08-03T10:00",
    paymentMethod: "on_site",
    participant: { kind: "new" as const, name: "Ania" },
  };
}

describe("createSlotFirstBookingSchema", () => {
  it("accepts a valid slot-first submission WITHOUT a sessionId", () => {
    const parsed = createSlotFirstBookingSchema(t).safeParse(validInput());
    expect(parsed.success).toBe(true);
  });

  it("requires a trainer", () => {
    const parsed = createSlotFirstBookingSchema(t).safeParse({ ...validInput(), trainerId: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(t("trainerRequired"));
  });

  it("requires a startTime", () => {
    const parsed = createSlotFirstBookingSchema(t).safeParse({ ...validInput(), startTime: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(t("startTimeRequired"));
  });

  it("validates the participant union like the standard schema", () => {
    const parsed = createSlotFirstBookingSchema(t).safeParse({
      ...validInput(),
      participant: { kind: "existing", athleteId: "" },
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(t("athleteRequired"));
  });

  it("rejects an unknown payment method", () => {
    const parsed = createSlotFirstBookingSchema(t).safeParse({
      ...validInput(),
      paymentMethod: "crypto",
    });
    expect(parsed.success).toBe(false);
  });
});
