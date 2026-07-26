import { z } from "zod";

/**
 * Zod schemas for extra_fee (Faza 27, §2.41, EPIK 42).
 */

export const extraFeeStatus = z.enum(["pending", "paid", "cancelled"]);

export const extraFeePaymentMethod = z.enum(["online", "cash"]);

export const createExtraFeeSchema = z.object({
  clientId: z.string().min(1),
  athleteId: z.string().optional(),
  bookingId: z.string().optional(),
  groupTypeId: z.string().optional(),
  sessionId: z.string().optional(),
  amount: z.number().int().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(500),
  paymentMethod: extraFeePaymentMethod,
});

export const bulkCreateExtraFeeSchema = z.object({
  sessionId: z.string().min(1),
  amount: z.number().int().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(500),
  paymentMethod: extraFeePaymentMethod,
});

export const confirmCashExtraFeeSchema = z.object({
  extraFeeId: z.string().min(1),
});

export const cancelExtraFeeSchema = z.object({
  extraFeeId: z.string().min(1),
});

export const requestInvoiceExtraFeeSchema = z.object({
  extraFeeId: z.string().min(1),
});

export const markExtraFeeInvoiceIssuedSchema = z.object({
  extraFeeId: z.string().min(1),
  invoiceNumber: z.string().min(1),
});

export type CreateExtraFeeInput = z.infer<typeof createExtraFeeSchema>;
export type BulkCreateExtraFeeInput = z.infer<typeof bulkCreateExtraFeeSchema>;
