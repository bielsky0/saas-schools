import { z } from "zod";

import type { NamespaceTranslator } from "@/lib/i18n";
import { SLUG_MAX, SLUG_MIN, SLUG_PATTERN } from "@/lib/validation";

/**
 * Blog post validation (blog-templates-cms F5.1). The dashboard blog form posts
 * through server actions, so this schema is the single place a wire value is
 * checked — mirroring the `groups/schema.ts` convention (wire vocabulary is
 * plain constants; human prose goes through a translator factory).
 */

const statusEnum = z.enum(["draft", "published"]);
export const blogStatus = statusEnum;

type ValidationTranslator = NamespaceTranslator<"blog">;

const seoSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(320).optional().or(z.literal("")),
  ogImage: z.string().trim().url().max(2048).optional().or(z.literal("")),
  noIndex: z.boolean().optional(),
});

export function createBlogPostSchema(t: ValidationTranslator) {
  return z.object({
    title: z.string().trim().min(2, t("titleMin")).max(160, t("titleMax")),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(SLUG_MIN, t("slugMin"))
      .max(SLUG_MAX, t("slugMax"))
      .regex(SLUG_PATTERN, t("slugFormat"))
      .optional()
      .or(z.literal("")),
    body: z.string().max(500_000, t("bodyMax")).optional().or(z.literal("")),
    excerpt: z.string().max(1000, t("excerptMax")).optional().or(z.literal("")),
    image: z.string().trim().max(2048, t("imageMax")).optional().or(z.literal("")),
    tags: z.array(z.string().trim().max(40)).max(10).optional().default([]),
    categories: z.array(z.string().trim().max(40)).max(10).optional().default([]),
    seo: seoSchema.optional(),
    status: statusEnum.optional(),
    templateId: z.string().trim().max(100).optional().or(z.literal("")),
  });
}

export type BlogPostFormValues = z.input<ReturnType<typeof createBlogPostSchema>>;
