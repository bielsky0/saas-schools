import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { createClientSession } from "@/features/client-auth/session";
import { loginSchema } from "@/features/client-auth/schema";
import { identityFrom, passwordLoginLimitDecision } from "@/features/client-auth/rate-limit";
import { verifyClientPassword, getDummyPasswordHash } from "@/features/client-auth/password";
import { servedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { client } from "@/lib/db/schema";

/**
 * POST /api/client-auth/login — sign in with email and password
 * (langlion spec v19, EPIK 44 US-44.2, Faza 29b).
 *
 * ─── TIMING SAFETY ──────────────────────────────────────────────────────────
 *
 * `verifyClientPassword` runs on EVERY request — against the real hash when the
 * client exists and has a password, against a pre-computed dummy scrypt hash
 * when the client does not exist or has no password set. Both paths have
 * identical computational cost (scrypt N=16384), so the response time does not
 * reveal whether the email is registered — a classic timing oracle neutralised
 * at the cost of one extra scrypt invocation on the failure path.
 *
 * Before Faza 29b, no `password_hash` column existed — every client was OTP-only.
 * The `passwordHash IS NOT NULL` guard is deliberately NOT a WHERE predicate
 * (which would leak information), but a code branch after retrieving the row.
 * A NULL hash is replaced with the dummy hash and verification runs anyway, then
 * fails because the hash does not match any known password.
 *
 * ─── RATE LIMITING ──────────────────────────────────────────────────────────
 *
 * Counted BEFORE the hash lookup so a throttled attacker cannot burn server CPU
 * on scrypt. Per-address (10/15 min) and per-IP (30/15 min), reusing the same
 * adapter and key format as the OTP limits (Rozstrzygniecie #38).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const organization = await servedOrganization();
  if (!organization) {
    return NextResponse.json({ error: "unknown_organization" }, { status: 404 });
  }

  const identity = identityFrom(request.headers);
  const limited = await passwordLoginLimitDecision(organization.id, parsed.data.email, identity);
  if (limited) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const row = await withTenant(organization.id, (tx) =>
    tx
      .select({ id: client.id, passwordHash: client.passwordHash })
      .from(client)
      .where(
        and(
          eq(client.organizationId, organization.id),
          eq(client.email, parsed.data.email),
          isNull(client.deletedAt),
        ),
      )
      .limit(1),
  );

  const found = row[0] ?? null;

  /*
   * Timing safety: `verifyClientPassword` always runs, so an attacker cannot
   * distinguish "email exists, wrong password" from "email does not exist" by
   * timing the response. When the client is not found (or has no password_hash),
   * the dummy hash is used — same scrypt cost, never matching the provided password.
   */
  const hashToVerify = found?.passwordHash ?? (await getDummyPasswordHash());
  const valid = await verifyClientPassword(hashToVerify, parsed.data.password);

  if (!found || !valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createClientSession(organization.id, found.id);

  return NextResponse.json({ ok: true });
}
