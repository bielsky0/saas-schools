import { z } from "zod";

import { isReservedSlug } from "./reserved-slugs";

export function createPageSchema() {
  return z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: z
      .string()
      .trim()
      .min(0)
      .max(100)
      .refine((v) => !isReservedSlug(v), "Slug is reserved"),
    status: z.enum(["draft", "published"]).default("draft"),
  });
}
export type CreatePageValues = z.infer<ReturnType<typeof createPageSchema>>;

export function updatePageSchema() {
  return z.object({
    title: z.string().trim().min(1, "Title is required").max(200).optional(),
    slug: z
      .string()
      .trim()
      .min(0)
      .max(100)
      .refine((v) => !isReservedSlug(v), "Slug is reserved")
      .optional(),
    status: z.enum(["draft", "published"]).optional(),
  });
}
export type UpdatePageValues = z.infer<ReturnType<typeof updatePageSchema>>;

export const createMediaSchema = z.object({
  fileId: z.string().uuid(),
  altText: z.string().max(400).nullable().optional(),
});

export const grantBlockSchema = z.object({
  blockKey: z.string().min(1).max(100),
});

export const listPagesQuerySchema = z.object({
  status: z.enum(["draft", "published"]).optional(),
  page: z.coerce.number().int().min(0).max(1000).catch(0),
});
