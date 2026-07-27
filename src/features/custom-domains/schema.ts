import { z } from "zod";

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .transform((d) => d.toLowerCase().trim())
    .refine((d) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d), {
      message: "Invalid domain format",
    })
    .refine((d) => !/^\d+(\.\d+)+$/.test(d), {
      message: "IP address is not a valid domain",
    })
    .refine((d) => d !== "langlion.pl" && !d.endsWith(".langlion.pl"), {
      message: "Cannot use a platform domain (langlion.pl) as custom domain",
    }),
});

export const verifyDomainSchema = z.object({
  domainId: z.string().min(1, "Domain ID is required"),
});

export const removeDomainSchema = z.object({
  domainId: z.string().min(1, "Domain ID is required"),
});

export type AddDomainInput = z.infer<typeof addDomainSchema>;
