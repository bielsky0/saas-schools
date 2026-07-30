import { z } from "zod";

import type { NamespaceTranslator } from "@/lib/i18n";
import { isAllowedMeetingUrl } from "@/features/cms/href-validator";

/**
 * Session validation (langlion §1.2, §2.2, EPIK 3).
 *
 * The recurrence PATTERN is validated in `features/groups/schema.ts` — it belongs
 * to the Definition. What lives here is the Realisation: per-session edits an
 * admin makes to an already-generated row (§3.4/AC9, US-14.4, US-22.3).
 */

type ValidationTranslator = NamespaceTranslator<"schedule.validation">;

/** Wire vocabulary, not prose — see the note in `features/groups/schema.ts`. */
export const sessionStatus = z.enum(["scheduled", "cancelled"]);

/**
 * A manual per-session adjustment.
 *
 * Every field is optional because the three things an admin edits here are
 * independent: move it in time, move it to another room, or make space
 * (US-14.4 — the only legitimate way past a full session, since no role may
 * exceed capacity). Persisting any of the first two must also set
 * `isManuallyAdjusted`, so a later bulk update from the pattern skips this row
 * (§3.4/AC8) — that is the action's job, not this schema's.
 */
export function updateSessionSchema(t: ValidationTranslator) {
  return (
    z
      .object({
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        locationId: z.string().min(1).nullish(),
        capacity: z.coerce.number().int().positive(t("capacityInvalid")).optional(),
        meetingUrl: z.union([z.string().url().refine(isAllowedMeetingUrl), z.null()]).optional(),
      })
      .refine((v) => !(v.startTime && v.endTime) || v.endTime > v.startTime, {
        message: t("endBeforeStart"),
        path: ["endTime"],
      })
      .refine((v) => Boolean(v.startTime) === Boolean(v.endTime), {
        message: t("bothTimesRequired"),
        path: ["endTime"],
      })
  );
}

export type UpdateSessionValues = z.infer<ReturnType<typeof updateSessionSchema>>;

/**
 * AF/SF single session creation (F18, §2.1).
 *
 * Availability-First: admin creates a manual session (no recurrence pattern).
 * Trainer conflict = Hard Block. Availability from F17.5 shown as soft warning.
 */
export function createSessionSchema(t: ValidationTranslator) {
  return z
    .object({
      groupTypeId: z.string().min(1, t("groupTypeRequired")),
      trainerId: z.string().min(1, t("trainerRequired")),
      startTime: z.coerce.date(t("startTimeInvalid")),
      endTime: z.coerce.date(t("endTimeInvalid")),
      locationId: z.string().min(1).nullable().optional(),
      capacity: z.coerce.number().int().positive(t("capacityInvalid")).optional(),
    })
    .refine((v) => v.endTime > v.startTime, {
      message: t("endBeforeStart"),
      path: ["endTime"],
    });
}

export type CreateSessionValues = z.infer<ReturnType<typeof createSessionSchema>>;
