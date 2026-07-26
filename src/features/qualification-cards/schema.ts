import { z } from "zod";

/**
 * Zod schemas for qualification card forms (Faza 26, §2.40, EPIK 41).
 *
 * Two phases, two schemas — phase 1 (parent before camp) and phase 2
 * (leader after camp). The parent phase is used both in the enrollment flow
 * and on the standalone card-fill page. The leader phase is admin-only.
 */

export const qualificationCardStatus = z.enum([
  "parent_pending",
  "parent_completed",
  "leader_completed",
]);

export function createParentPhaseSchema() {
  return z.object({
    chronicConditions: z.string().trim().max(2000).optional().or(z.literal("")),
    medications: z.string().trim().max(2000).optional().or(z.literal("")),
    allergies: z.string().trim().max(2000).optional().or(z.literal("")),
    dietaryRestrictions: z.string().trim().max(2000).optional().or(z.literal("")),
    vaccinationsInfo: z.string().trim().max(2000).optional().or(z.literal("")),
    parentContactDuringCamp: z.string().trim().max(500).optional().or(z.literal("")),
  });
}

export function createLeaderPhaseSchema() {
  return z.object({
    healthDuringCamp: z.string().trim().max(5000).optional().or(z.literal("")),
    incidents: z.string().trim().max(5000).optional().or(z.literal("")),
  });
}

export type ParentPhaseValues = z.infer<ReturnType<typeof createParentPhaseSchema>>;
export type LeaderPhaseValues = z.infer<ReturnType<typeof createLeaderPhaseSchema>>;
