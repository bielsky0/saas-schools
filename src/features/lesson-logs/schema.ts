import { z } from "zod";

/**
 * Lesson topic & homework schemas (Faza 28, §2.42, EPIK 43).
 */

export const lessonTopicSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1, "validation.titleRequired"),
  body: z.string().optional(),
});

export const createHomeworkSchema = z.object({
  sessionId: z.string().min(1),
  description: z.string().min(1, "validation.descriptionRequired"),
  dueDate: z.string().optional(),
});

export const updateHomeworkSchema = z.object({
  homeworkId: z.string().min(1),
  description: z.string().min(1, "validation.descriptionRequired"),
  dueDate: z.string().optional(),
});

export const homeworkCompletionSchema = z.object({
  homeworkId: z.string().min(1),
  athleteId: z.string().min(1),
  status: z.enum(["done", "not_done"]),
});

export type LessonTopicInput = z.infer<typeof lessonTopicSchema>;
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;
export type HomeworkCompletionInput = z.infer<typeof homeworkCompletionSchema>;
