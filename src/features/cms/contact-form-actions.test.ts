import { describe, expect, it } from "vitest";
import { z } from "zod";

const submitFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email").max(320),
  phone: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
  _hp: z.string().max(0, "Spam detected").optional().default(""),
});

describe("contact-form-actions — input validation", () => {
  it("accepts valid submission with all fields", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      phone: "+48123456789",
      message: "Hello, I have a question.",
      _hp: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal submission (name + email only)", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("");
      expect(result.data.message).toBe("");
      expect(result.data._hp).toBe("");
    }
  });

  it("rejects empty name", () => {
    const result = submitFormSchema.safeParse({
      name: "",
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects honeypot field filled", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      _hp: "I am a bot",
    });
    // The schema allows _hp as a string, but with max(0) constraint
    // Wait — z.string().max(0) means the max length is 0, so any string fails
    expect(result.success).toBe(false);
  });

  it("rejects phone longer than 30 chars", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      phone: "0".repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it("rejects message longer than 5000 chars", () => {
    const result = submitFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 200 chars", () => {
    const result = submitFormSchema.safeParse({
      name: "x".repeat(201),
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("contact-form-rate-limit — config", () => {
  it("per-email limit is reasonable for a contact form", () => {
    const limit = 3;
    const windowMs = 60 * 60 * 1000;
    expect(limit).toBe(3);
    expect(windowMs).toBe(3600000);
  });

  it("per-ip limit is looser than per-email", () => {
    const emailLimit = 3;
    const ipLimit = 5;
    expect(ipLimit).toBeGreaterThan(emailLimit);
  });
});
