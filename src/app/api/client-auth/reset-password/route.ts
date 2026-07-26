import { NextResponse, type NextRequest } from "next/server";

import { servedOrganization } from "@/features/organizations/served-org";
import { identityFrom } from "@/features/client-auth/rate-limit";
import { resetPasswordSchema, clientPasswordSchema } from "@/features/client-auth/schema";
import { verifyOtp } from "@/features/client-auth/otp";
import { resetClientPassword } from "@/features/client-auth/password";
import { requestLocale } from "@/lib/i18n/request-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

function identityKey(key: string): string {
  return key;
}

/**
 * POST /api/client-auth/reset-password — reset a password after OTP verification
 * (langlion spec v19, EPIK 44 US-44.3, Faza 29b).
 *
 * ─── NO SESSION CREATED ─────────────────────────────────────────────────────
 *
 * This endpoint deliberately does NOT call `createClientSession`. The client
 * must log in with the new password through `POST /api/client-auth/login` after
 * the reset succeeds. This keeps `createClientSession` call sites intentional
 * and avoids a silent auto-login that would bypass the password verification
 * path.
 *
 * ─── RATE LIMITING ──────────────────────────────────────────────────────────
 *
 * Inherited from `verifyOtp` → `verifyLimitDecision` (10/15 min per address,
 * 40/15 min per IP). No separate rate limit is needed here — OTP verification
 * is the gating step, and the password update is a one-shot operation after
 * successful verification.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const organization = await servedOrganization();
  if (!organization) {
    return NextResponse.json({ error: "unknown_organization" }, { status: 404 });
  }

  const outcome = await verifyOtp({
    organizationId: organization.id,
    email: parsed.data.email,
    code: parsed.data.code,
    identity: identityFrom(request.headers),
  });

  if (outcome.status === "rate_limited") {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(outcome.retryAfterSeconds) } },
    );
  }

  if (outcome.status === "invalid") {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const strength = clientPasswordSchema(identityKey as (key: string) => string).safeParse(
    parsed.data.password,
  );

  if (!strength.success) {
    return NextResponse.json(
      { error: "weak_password", details: strength.error.flatten().formErrors },
      { status: 422 },
    );
  }

  // The locale of the request determines the notification language.
  // The parent has no stored language preference — this is the best available answer.
  const locale = (await requestLocale()) ?? DEFAULT_LOCALE;

  await resetClientPassword(
    organization.id,
    outcome.clientId,
    parsed.data.email,
    parsed.data.password,
    "self",
    locale,
  );

  return NextResponse.json({ ok: true });
}
