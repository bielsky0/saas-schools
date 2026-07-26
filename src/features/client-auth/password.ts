import { and, eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "better-auth/crypto";

import { clientActor, recordAudit } from "@/features/admin/audit";
import { emitDomainNotification } from "@/features/notifications/emit";
import { withTenant } from "@/lib/db/tenant";
import { client } from "@/lib/db/schema";
import { revokeAllSessionsForClient } from "./data";

/**
 * Client password hashing and verification (langlion spec v19, EPIK 44, Faza 29a).
 *
 * Uses Better Auth's scrypt implementation (`@better-auth/utils/password`) rather
 * than writing argon2 from scratch (spec §8 #26, verified at phase start). The
 * library picks `node:crypto scrypt` on Node.js / Bun / Deno and falls back to
 * `@noble/hashes scrypt` (pure JS) on unsupported runtimes. Configuration:
 * N=16384, r=16, p=1, dkLen=64. The hash format is `"salt:key"` hex-encoded.
 *
 * ─── THE TWO HIGH-LEVEL OPERATIONS AND WHY THEY DIFFER ───────────────────────
 *
 * `setClientPassword` — the client themselves chooses a password from the booking
 * confirmation screen. No notification is emitted (the client just did this and
 * sees the visual confirmation). An audit entry IS written.
 *
 * `resetClientPassword` — a password is changed WITHOUT the current owner's
 * immediate consent: either the "forgot password" OTP flow (F29b) or a future
 * staff-initiated reset. This MUST unvalidate every existing session
 * (Constraint 19 — same transaction as the hash update), emit the
 * `client_password_changed` notification (is_overridable=false), and log an
 * audit entry. The `triggeredBy` metadata distinguishes self-service reset
 * from a future staff-initiated one.
 */

export function hashClientPassword(plaintext: string): Promise<string> {
  return hashPassword(plaintext);
}

export function verifyClientPassword(hash: string, plaintext: string): Promise<boolean> {
  return verifyPassword({ hash, password: plaintext });
}

/**
 * Set a password for the first time (from the booking confirmation screen).
 *
 * Sets all three password columns. If the client already has a password_hash,
 * this updates it (the proposal screen can appear again in a future enrollment).
 * Audit only — no notification, because the client is the one performing this.
 */
export async function setClientPassword(
  organizationId: string,
  clientId: string,
  clientEmail: string,
  plaintext: string,
): Promise<void> {
  const hash = await hashClientPassword(plaintext);
  const now = new Date();

  await withTenant(organizationId, async (tx) => {
    const [existing] = await tx
      .select({ hasPassword: client.passwordHash })
      .from(client)
      .where(and(eq(client.id, clientId), eq(client.organizationId, organizationId)))
      .limit(1);

    const isFirstSet = !existing?.hasPassword;

    await tx
      .update(client)
      .set({
        passwordHash: hash,
        passwordSetAt: isFirstSet ? now : undefined,
        passwordUpdatedAt: now,
      })
      .where(and(eq(client.id, clientId), eq(client.organizationId, organizationId)));

    await recordAudit(tx, {
      action: "client_password.set",
      actor: clientActor(clientEmail),
      organizationId,
      targetType: "client",
      targetId: clientId,
      targetLabel: clientEmail,
      metadata: { triggeredBy: "self", isFirstSet },
    });
  });
}

export interface ResetPasswordResult {
  revokedSessionCount: number;
}

/**
 * Reset a password and revoke all sessions (Constraint 19).
 *
 * The hash update and the session purge are the SAME transaction: a commit
 * leaves the password changed and all former sessions gone; a rollback leaves
 * both unchanged. This is the invariant Constraint 19 demands.
 *
 * Emits `client_password_changed` notification (is_overridable=false) and an
 * audit entry. The `triggeredBy` metadata distinguishes the self-service
 * "forgot password" flow (F29b) from a future staff-initiated reset.
 */
export async function resetClientPassword(
  organizationId: string,
  clientId: string,
  clientEmail: string,
  newPlaintext: string,
  triggeredBy: "self" | "staff",
  locale: string,
): Promise<ResetPasswordResult> {
  const hash = await hashClientPassword(newPlaintext);
  const now = new Date();

  return withTenant(organizationId, async (tx) => {
    const revokedCount = await revokeAllSessionsForClient(tx, organizationId, clientId);

    await tx
      .update(client)
      .set({
        passwordHash: hash,
        passwordUpdatedAt: now,
      })
      .where(and(eq(client.id, clientId), eq(client.organizationId, organizationId)));

    await recordAudit(tx, {
      action: "client_password.reset",
      actor: clientActor(clientEmail),
      organizationId,
      targetType: "client",
      targetId: clientId,
      targetLabel: clientEmail,
      metadata: { triggeredBy, revokedSessionCount: revokedCount },
    });

    await emitDomainNotification(tx, {
      eventType: "client_password_changed",
      organizationId,
      accountId: null,
      recipients: [
        {
          kind: "client",
          clientId,
          email: clientEmail,
          locale,
        },
      ],
      params: {},
      dedupeBasis: `client_password:${clientId}:reset:${now.getTime()}`,
    });

    return { revokedSessionCount: revokedCount };
  });
}
