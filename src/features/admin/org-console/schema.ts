import { z } from "zod";

import { assignableRole } from "@/features/organizations/schema";
import {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_MAX,
  SUBDOMAIN_MIN,
  SUBDOMAIN_PATTERN,
} from "@/lib/validation";

/**
 * Org-console validation (apex-dashboard-plan Faza 4.1).
 *
 * The console edits a target ORGANIZATION's settings from the apex panel. Every
 * action carries an explicit `organizationId` (from the URL) — never smuggled
 * from a session. No `ctx.org` here: the acting principal is a super admin,
 * the target tenant comes from the route.
 *
 * Timezone/currency reuse the same ICU-trusted validation as the org feature
 * (`Intl.supportedValuesOf`), but with admin-panel English messages instead of
 * the translation tables the multilanguage org forms use.
 */

/** A real IANA timezone (Node ships full ICU — no hand-maintained list). */
const timezone = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Intl.supportedValuesOf("timeZone").includes(value), "Invalid timezone.");

/** A real ISO 4217 currency code. */
const currency = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) => Intl.supportedValuesOf("currency").includes(value),
    "Invalid currency code.",
  );

const subdomain = z
  .string()
  .trim()
  .toLowerCase()
  .min(SUBDOMAIN_MIN)
  .max(SUBDOMAIN_MAX)
  .regex(SUBDOMAIN_PATTERN, "Invalid subdomain.")
  .refine((value) => !RESERVED_SUBDOMAINS.includes(value), "Subdomain is reserved.");

/** Org settings the apex console may edit (apex-dashboard-plan 4.2 settings). */
export const orgSettingsSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  timezone,
  currency,
  scheduleStartHour: z.coerce.number().int().min(0).max(23),
  scheduleEndHour: z.coerce.number().int().min(0).max(23),
  scheduleSlotMinutes: z.coerce.number().int().min(5).max(120),
  subdomain,
  planId: z.string().min(1),
});

export type OrgSettingsValues = z.infer<typeof orgSettingsSchema>;

/** Change a member's role within the target org (apex-dashboard-plan 4.2 teams).
 *  Owner promotion is allowed for an EXISTING member; Owner is never granted by
 *  invite (organizations/schema — ownership is transferred). */
export const teamMemberActionSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: assignableRole.optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export type TeamMemberActionValues = z.infer<typeof teamMemberActionSchema>;

/** Membership permission override (apex-dashboard-plan 4.2 teams). */
export const memberPermissionOverrideSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  permissionKey: z.string().min(1),
  allowed: z.boolean(),
});

/** Publish one CMS page (apex-dashboard-plan 4.2 pages — rollback lands in Faza 6). */
export const publishPageSchema = z.object({
  organizationId: z.string().min(1),
  pageId: z.string().min(1),
});