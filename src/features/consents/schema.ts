import { z } from "zod";

export const createConsentDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  file_id: z.string().optional(),
  body: z.string().trim().optional(),
  isRequiredAtSignup: z.coerce.boolean().optional().default(false),
});

export const updateConsentDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(255).optional(),
  file_id: z.string().optional().nullable(),
  body: z.string().trim().optional().nullable(),
  isRequiredAtSignup: z.coerce.boolean().optional(),
});

export type CreateConsentDocumentValues = z.infer<typeof createConsentDocumentSchema>;
export type UpdateConsentDocumentValues = z.infer<typeof updateConsentDocumentSchema>;
