import { z } from "zod";

/**
 * Admin panel validation (spec 6.2) — list filters and action payloads.
 *
 * Isomorphic: imported by the filter form and by the server pages/actions, like
 * every other feature's `schema.ts`.
 */

/** Rows per page in every admin list. */
export const PAGE_SIZE = 25;

export const USER_STATUSES = ["all", "active", "suspended", "deleted"] as const;
export type UserStatusFilter = (typeof USER_STATUSES)[number];

/**
 * A searchParams schema, so it is parsed once and every field has a safe default.
 *
 * `.catch()` on each field rather than a failing `.safeParse`: a hand-edited URL
 * (`?page=banana`) must degrade to the default view, never a 500. The whole point
 * of putting filters in the URL is that people edit and share them.
 */
export const userListQuerySchema = z.object({
  q: z.string().trim().max(200).catch(""),
  status: z.enum(USER_STATUSES).catch("all"),
  from: z.string().trim().catch(""),
  to: z.string().trim().catch(""),
  // Clamped: a huge offset is a cheap way to make Postgres sort the whole table.
  page: z.coerce.number().int().min(0).max(10_000).catch(0),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

/**
 * Organization lifecycle statuses (apex-dashboard-plan 2.1). `all` is the
 * list-filter sentinel, not a stored value. Stored values — `trial|active|
 * suspended|inactive` — live in `organization.status` (migration 0090), kept in
 * sync by the subscription webhook and the soft-delete actions.
 */
export const ORG_STATUSES = ["all", "active", "suspended", "trial", "inactive"] as const;
export type OrgStatusFilter = (typeof ORG_STATUSES)[number];

export const orgListQuerySchema = z.object({
  q: z.string().trim().max(200).catch(""),
  status: z.enum(ORG_STATUSES).catch("all"),
  /** Plan code — matches the org's current live subscription planId. */
  plan: z.string().trim().max(100).catch(""),
  from: z.string().trim().catch(""),
  to: z.string().trim().catch(""),
  page: z.coerce.number().int().min(0).max(10_000).catch(0),
});

export type OrgListQuery = z.infer<typeof orgListQuerySchema>;

export const auditListQuerySchema = z.object({
  /** Matches actor email, target label, or action. */
  q: z.string().trim().max(200).catch(""),
  page: z.coerce.number().int().min(0).max(10_000).catch(0),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

/** Payloads for the admin server actions. */
export const userTargetSchema = z.object({
  userId: z.string().min(1),
});

export const suspendUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Impersonation requires a REASON (spec 6.4) — a separate schema from
 * `userTargetSchema`, and deliberately not a reuse of `suspendUserSchema`.
 *
 * `min(10)` rather than `min(1)`: a mandatory field that accepts "x" is theatre,
 * and this is the one action in the panel that reads another person's account. The
 * reason lands in the audit entry's metadata, where the org whose data was read can
 * see it — so it is written FOR someone, not merely recorded.
 *
 * Note the contrast with `suspendUserSchema.reason`, which stays optional: a
 * suspension is a visible, reversible state change on our own platform, and its
 * justification is usually the ticket that prompted it. Reading someone's account
 * leaves no trace anywhere else.
 */
export const impersonateUserSchema = z.object({
  userId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason of at least 10 characters — it is recorded in the audit log.")
    .max(500),
});

export const orgTargetSchema = z.object({
  organizationId: z.string().min(1),
});

export const setSuperAdminSchema = z.object({
  userId: z.string().min(1),
  value: z.enum(["grant", "revoke"]),
});

// ── Feature flags (apex-dashboard-plan Faza 3) ─────────────────────────────

/**
 * Metric names the conditional-flag engine can count
 * (`flags.ts` `countMetric`). Keep in sync with that switch.
 */
export const FLAG_METRICS = [
  "members",
  "max_groups",
  "max_trainers",
  "max_locations",
  "max_sessions_per_month",
] as const;
export type FlagMetric = (typeof FLAG_METRICS)[number];

/** Payload for creating / updating a feature-flag dictionary row. */
export const flagCreateSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  enabledGlobal: z.boolean().default(false),
  condition: z
    .object({
      metric: z.enum(FLAG_METRICS),
      gte: z.number().int().min(0),
    })
    .nullable()
    .optional(),
});

export type FlagCreateInput = z.infer<typeof flagCreateSchema>;

/** The three states a matrix cell can take (apex-dashboard-plan Faza 3.1). */
export const FLAG_VALUE_STATES = ["on", "off", "inherit"] as const;
export type FlagValueState = (typeof FLAG_VALUE_STATES)[number];

/** One override change — scope is 'group' | 'organization'; global never
 * stores a row, it flips the dictionary's `enabledGlobal` instead. */
export const flagValueSetSchema = z.object({
  featureKey: z.string().min(1),
  scope: z.enum(["group", "organization"]),
  scopeId: z.string().min(1),
  value: z.enum(FLAG_VALUE_STATES),
});

export const flagTargetSchema = z.object({
  featureKey: z.string().min(1),
});

/** Global column toggle — flips the dictionary's `enabledGlobal` base layer. */
export const flagGlobalSetSchema = z.object({
  featureKey: z.string().min(1),
  enabled: z.boolean(),
});
