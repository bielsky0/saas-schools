import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { servedOrganization } from "@/features/organizations/served-org";
import { requireClient } from "@/features/client-auth/session";
import { clientPasswordSchema } from "@/features/client-auth/schema";
import { setClientPassword } from "@/features/client-auth/password";

const setPasswordSchema = z.object({
  password: z.string(),
});

function identityKey(key: string): string {
  return key;
}

/**
 * POST /api/client-auth/password — set a password from the booking confirmation
 * screen (langlion spec v19, EPIK 44 US-44.1, Faza 29a).
 *
 * ─── DEFENSE-IN-DEPTH ────────────────────────────────────────────────────────
 *
 * This endpoint trusts the session (cookie) as proof of identity, and it adds
 * an explicit `isVerified` gate BELOW what the session already guarantees.
 * Today session == OTP == verified client, so the check is redundant by
 * construction — but it guards against a future code path that creates a session
 * without verification (staff impersonation, magic link, etc). The cost is zero
 * additional queries: `isVerified` is already on `ClientPrincipal`, read from
 * the same joined row that resolves the session.
 *
 * Password strength is validated BEFORE hashing, using the same policy as staff
 * passwords (min 8, letter + digit). A malformed request is a 400; a missing or
 * unverified session is a 401/403.
 *
 * No notification is emitted: the client just chose the password themselves on
 * the screen that immediately confirms it. The `client_password_changed`
 * notification is reserved for `resetClientPassword` (F29b).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const organization = await servedOrganization();
  if (!organization) {
    return NextResponse.json({ error: "unknown_organization" }, { status: 404 });
  }

  let principal;
  try {
    principal = await requireClient(organization.id);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // DEFENSE-IN-DEPTH: do not allow an unverified client to set a password,
  // regardless of session validity. Today session == OTP == verified, but a
  // future path that creates sessions for unverified clients must not silently
  // inherit the ability to set credentials.
  if (!principal.isVerified) {
    return NextResponse.json({ error: "unverified_client" }, { status: 403 });
  }

  // Validate password strength (min 8, letter + digit — same policy as staff).
  // The translator is a minimal identity function: error codes are stable machine
  // keys that the client maps to its own i18n. Using the factory with raw keys
  // rather than a full next-intl Translator avoids depending on request-locale
  // plumbing for a route that returns JSON anyway.
  const strength = clientPasswordSchema(identityKey as (key: string) => string).safeParse(
    parsed.data.password,
  );

  if (!strength.success) {
    return NextResponse.json(
      { error: "weak_password", details: strength.error.flatten().formErrors },
      { status: 422 },
    );
  }

  await setClientPassword(organization.id, principal.clientId, principal.email, parsed.data.password);

  return NextResponse.json({ ok: true });
}
