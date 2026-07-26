import { describe, expect, it } from "vitest";

import {
  createHomeworkSchema,
  homeworkCompletionSchema,
  lessonTopicSchema,
  updateHomeworkSchema,
} from "./schema";

/**
 * Lesson log schema validation (Faza 28, §2.42, EPIK 43).
 */

describe("lessonTopicSchema", () => {
  it("accepts a valid topic with title and body", () => {
    const result = lessonTopicSchema.safeParse({
      sessionId: "cs-1",
      title: "Present Continuous",
      body: "Wprowadzenie do czasu Present Continuous",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid topic with no body", () => {
    const result = lessonTopicSchema.safeParse({
      sessionId: "cs-1",
      title: "Present Continuous",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = lessonTopicSchema.safeParse({
      sessionId: "cs-1",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sessionId", () => {
    const result = lessonTopicSchema.safeParse({
      title: "Present Continuous",
    });
    expect(result.success).toBe(false);
  });
});

describe("createHomeworkSchema", () => {
  it("accepts a valid homework with description", () => {
    const result = createHomeworkSchema.safeParse({
      sessionId: "cs-1",
      description: "Ćwiczenia 1-5, strona 42",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid homework with due date", () => {
    const result = createHomeworkSchema.safeParse({
      sessionId: "cs-1",
      description: "Ćwiczenia 1-5",
      dueDate: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = createHomeworkSchema.safeParse({
      sessionId: "cs-1",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sessionId", () => {
    const result = createHomeworkSchema.safeParse({
      description: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateHomeworkSchema", () => {
  it("accepts a valid update", () => {
    const result = updateHomeworkSchema.safeParse({
      homeworkId: "hw-1",
      description: "Zaktualizowane ćwiczenia",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing homeworkId", () => {
    const result = updateHomeworkSchema.safeParse({
      description: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("homeworkCompletionSchema", () => {
  it("accepts status done", () => {
    const result = homeworkCompletionSchema.safeParse({
      homeworkId: "hw-1",
      athleteId: "ath-1",
      status: "done",
    });
    expect(result.success).toBe(true);
  });

  it("accepts status not_done", () => {
    const result = homeworkCompletionSchema.safeParse({
      homeworkId: "hw-1",
      athleteId: "ath-1",
      status: "not_done",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    const result = homeworkCompletionSchema.safeParse({
      homeworkId: "hw-1",
      athleteId: "ath-1",
      status: "in_progress",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing athleteId", () => {
    const result = homeworkCompletionSchema.safeParse({
      homeworkId: "hw-1",
      status: "done",
    });
    expect(result.success).toBe(false);
  });
});
