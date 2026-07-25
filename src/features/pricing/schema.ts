import { z } from "zod";

import type { NamespaceTranslator } from "@/lib/i18n";

type ValidationTranslator = NamespaceTranslator<"pricing.validation">;

export const grantPriceOverrideSchema = (t: ValidationTranslator) =>
  z.object({
    clientId: z.string().min(1, t("clientRequired")),
    groupTypeId: z.string().nullable().optional(),
    overrideType: z.enum(["percent_discount", "fixed_price"]),
    value: z.coerce.number().int().nonnegative(t("valueInvalid")),
    validFrom: z.string().min(1, t("validFromRequired")),
    validUntil: z.string().nullable().optional(),
    reason: z.string().trim().min(1, t("reasonRequired")),
  });

export const deactivatePriceOverrideSchema = (t: ValidationTranslator) =>
  z.object({
    overrideId: z.string().min(1, t("overrideIdRequired")),
  });

export type GrantPriceOverrideInput = z.infer<ReturnType<typeof grantPriceOverrideSchema>>;
export type DeactivatePriceOverrideInput = z.infer<ReturnType<typeof deactivatePriceOverrideSchema>>;
