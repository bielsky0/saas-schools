import { describe, expect, it } from "vitest";

import {
  createExtraFeeSchema,
  bulkCreateExtraFeeSchema,
} from "./schema";

/**
 * Extra fee validation (Faza 27, EPIK 42).
 *
 * Unit-tested: amount > 0, description required, and basic shape
 * validation before the request reaches the data layer.
 */

describe("createExtraFeeSchema", () => {
  it("accepts a valid cash extra_fee", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "Str\u00f3j treningowy",
      amount: 10000,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid online extra_fee", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "Wpisowe",
      amount: 5000,
      paymentMethod: "online",
      athleteId: "athlete-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects amount = 0", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "Test",
      amount: 0,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "Test",
      amount: -100,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "",
      amount: 100,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing clientId", () => {
    const result = createExtraFeeSchema.safeParse({
      description: "Test",
      amount: 100,
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid payment method", () => {
    const result = createExtraFeeSchema.safeParse({
      clientId: "client-1",
      description: "Test",
      amount: 100,
      paymentMethod: "card",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkCreateExtraFeeSchema", () => {
  it("accepts valid bulk input", () => {
    const result = bulkCreateExtraFeeSchema.safeParse({
      sessionId: "session-1",
      amount: 5000,
      description: "Wycieczka",
      paymentMethod: "cash",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sessionId", () => {
    const result = bulkCreateExtraFeeSchema.safeParse({
      amount: 5000,
      description: "Test",
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });
});
