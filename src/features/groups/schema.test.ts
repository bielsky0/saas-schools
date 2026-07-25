import { describe, expect, it } from "vitest";

import type { NamespaceTranslator } from "@/lib/i18n";
import { createGroupTypeSchema } from "./schema";

const t = ((key: string) => key) as NamespaceTranslator<"groups.validation">;

describe("createGroupTypeSchema", () => {
  it("accepts slot_first with defaultCapacity = 1", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "slot_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["single_class"],
      defaultCapacity: 1,
    });
    expect(result.success).toBe(true);
  });

  it("refuses slot_first with defaultCapacity > 1", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "slot_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["single_class"],
      defaultCapacity: 3,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("defaultCapacity");
    }
  });

  it("accepts slot_first with defaultCapacity undefined (defaults to 1)", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "slot_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["single_class"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts schedule_first with any defaultCapacity", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "schedule_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["package"],
      allowedBillingTypes: ["one_time"],
      defaultCapacity: 20,
    });
    expect(result.success).toBe(true);
  });

  it("accepts availability_first with any defaultCapacity", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "availability_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["single_class"],
      defaultCapacity: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts defaultDurationMinutes for any engine", () => {
    const result = createGroupTypeSchema(t).safeParse({
      name: "Test",
      slug: "test",
      engine: "slot_first",
      paymentPolicy: "on_site",
      price: 1000,
      isNewClientOnly: false,
      allowedPurchaseModes: ["single_class"],
      defaultDurationMinutes: 30,
      defaultCapacity: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultDurationMinutes).toBe(30);
    }
  });
});
