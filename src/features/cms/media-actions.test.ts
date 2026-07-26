import { describe, expect, it } from "vitest";

import { createMediaSchema } from "./schema";

describe("createMediaSchema validation", () => {
  it("accepts a valid UUID fileId", () => {
    const result = createMediaSchema.safeParse({
      fileId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts altText as optional", () => {
    const result = createMediaSchema.safeParse({
      fileId: "550e8400-e29b-41d4-a716-446655440000",
      altText: "A photo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID fileId", () => {
    const result = createMediaSchema.safeParse({
      fileId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty fileId", () => {
    const result = createMediaSchema.safeParse({
      fileId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts nullable altText explicitly", () => {
    const result = createMediaSchema.safeParse({
      fileId: "550e8400-e29b-41d4-a716-446655440000",
      altText: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects altText over 400 chars", () => {
    const result = createMediaSchema.safeParse({
      fileId: "550e8400-e29b-41d4-a716-446655440000",
      altText: "x".repeat(401),
    });
    expect(result.success).toBe(false);
  });
});
