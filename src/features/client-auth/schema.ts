import { z } from "zod";

import { OTP_LENGTH } from "./config";

/**
 * Request validation for the parent-authentication endpoints (plan F3).
 *
 * PLAIN ZOD, NO TRANSLATOR — unlike `features/clients/schema.ts` and every form
 * schema in the app. These validate a JSON API rather than a form: the response
 * carries a stable machine-readable `error` code and the UI that lands in F5 owns
 * the wording. Putting user-facing copy here would mean two places to change a
 * sentence, one of which nobody renders.
 */

/*
 * ─── THE ACADEMY IS NO LONGER A FIELD (F4.5, closes D39) ────────────────────
 *
 * These schemas used to carry a `subdomain`. The tenant now comes from the
 * `Host` header — resolved in `src/proxy.ts`, read via `servedOrganization()` —
 * so a caller cannot name an academy other than the one it addressed. Removing
 * the field rather than accepting-and-ignoring it is the point: an ignored field
 * reads like a supported one to anyone writing a client against these routes.
 */

/**
 * Lowercased, exactly as `client.email` is stored — the pair
 * `(organizationId, email)` is a UNIQUE key, and "Anna@…" arriving as a second
 * parent alongside "anna@…" would be two people who are one person.
 */
const email = z.email().trim().toLowerCase();

export const requestCodeSchema = z.object({
  email,
  /**
   * Carried through to the US-4.1 upsert. Optional for the same reason it is
   * optional on the column: the row may be created before the parent has finished
   * typing, and an academy that does not collect phone numbers should not be made
   * to invent one.
   */
  name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const verifyCodeSchema = z.object({
  email,
  /**
   * Digits only, exact length — the shape `generateCode` produces. A malformed
   * code is refused before it reaches the database, but it is refused with the
   * SAME response as a wrong one: length and charset are not facts worth
   * confirming to someone guessing.
   */
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
});

/*
 * `logoutSchema` is GONE, not emptied. With the subdomain removed it had no
 * fields left, and a `z.object({})` on a route that reads nothing from the body
 * is a prop that looks like validation. Logout now takes no body at all — see
 * the route.
 */

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

/**
 * Shared password validation for client passwords (langlion spec v19, EPIK 44,
 * Faza 29a).
 *
 * MATCHES THE STAFF PASSWORD POLICY from `features/auth/schema.ts` — min 8
 * characters, at least one letter and one digit. The policy is the same because
 * the credential surface is the same: a password protecting an account.
 *
 * Factory pattern (not a constant), same as staff schemas, so the error
 * messages are translated. The caller passes a `useTranslations()`-derived
 * translator.
 *
 * Used by:
 *   - POST /api/client-auth/password (server-side, translated error codes)
 *   - the enrollment-flow password proposal section (client-side, instant
 *     feedback)
 */
export function clientPasswordSchema(t: { (key: string): string }) {
  return z
    .string()
    .min(8, t("passwordMin"))
    .regex(/[A-Za-z]/, t("passwordLetter"))
    .regex(/\d/, t("passwordNumber"));
}

export type ClientPasswordValues = z.infer<ReturnType<typeof clientPasswordSchema>>;
