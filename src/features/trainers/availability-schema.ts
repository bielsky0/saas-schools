import { z } from "zod";

export const DAY_LABELS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type DayLabel = (typeof DAY_LABELS)[number];

export const availabilitySchema = z
  .object({
    trainerId: z.string().min(1),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM"),
    locationId: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM").optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM").optional(),
    locationId: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime !== undefined && data.endTime !== undefined) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: "startTime must be before endTime",
      path: ["endTime"],
    },
  );
