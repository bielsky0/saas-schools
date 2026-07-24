import { z } from "zod";

export const createPolicyDocumentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  file_id: z.string().min(1),
});
