import { expect, test } from "./rate-limit-fixtures";
import type { APIRequestContext } from "@playwright/test";

import {
  issueAndReadCode,
  otpState,
  resetPassword,
  setClientPassword,
  verifyCode,
} from "./client-auth-fixtures";
import { uniqueEmail, waitForEmail } from "./helpers";
import { uniqueSubdomain } from "./host-fixtures";
import { registerViaApi, seedOrgFull } from "./helpers";
import { uniqueId } from "./billing-fixtures";

/**
 * Client password tests (langlion spec v19, EPIK 44, Faza 29a).
 *
 * ─── WHAT THESE TESTS COVER ──────────────────────────────────────────────────
 *
 *  - US-44.1/AC1: setting a password from the booking confirmation screen
 *    (exercised through the API endpoint, since F29b builds the login page UI).
 *  - US-44.1/AC4: skipping password setup leaves password_hash NULL.
 *  - US-44.1/AC5: password_hash is set after successful password creation.
 *  - US-44.2/AC2: client with password_session (tested implicitly).
 *  - US-44.3/AC3: reset revokes ALL sessions (Constraint 19).
 *  - US-44.4: weak passwords are rejected.
 *  - Notification: set does NOT email client_password_changed; reset DOES.
 *
 * ─── THE PASSWORD SET FLOW IN THESE TESTS ────────────────────────────────────
 *
 * "Set" happens AFTER a verified client has a session, which is how the
 * booking confirmation screen works: the client first verifies via OTP, gets a
 * session, then the success screen offers the password proposal. These tests
 * mirror that: issue → verify → session present → set password.
 */

async function seedAcademy(request: APIRequestContext, prefix: string) {
  const email = uniqueEmail(`${prefix}-owner`);
  await registerViaApi(request, email);
  const { orgId, subdomain } = await seedOrgFull(request, {
    ownerEmail: email,
    name: `${prefix} Academy`,
    slug: uniqueId(prefix),
    subdomain: uniqueSubdomain(prefix),
  });
  return { orgId, subdomain };
}

test("setting a password from a verified session stores the hash", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-set");
  const email = uniqueEmail("parent");

  // Issue OTP → verify → session present
  const code = await issueAndReadCode(request, subdomain, email);
  const verify = await verifyCode(request, subdomain, { email, code });
  expect(verify.ok()).toBe(true);

  const before = await otpState(request, subdomain, email);
  expect(before.isVerified).toBe(true);
  expect(before.liveSessions).toBe(1);
  expect(before.hasPassword).toBe(false);

  // Set password via the production endpoint (client session required)
  const res = await setClientPassword(request, subdomain, "ValidPass1");
  expect(res.ok(), `set password failed: ${await res.text()}`).toBe(true);

  const after = await otpState(request, subdomain, email);
  expect(after.hasPassword).toBe(true);
  expect(after.liveSessions).toBe(1);
});

test("a weak password is rejected with 422", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-weak");
  const email = uniqueEmail("parent");

  const code = await issueAndReadCode(request, subdomain, email);
  const verify = await verifyCode(request, subdomain, { email, code });
  expect(verify.ok()).toBe(true);

  // Too short
  const short = await setClientPassword(request, subdomain, "Ab1");
  expect(short.status()).toBe(422);

  // No digit
  const noDigit = await setClientPassword(request, subdomain, "abcdefgh");
  expect(noDigit.status()).toBe(422);

  // No letter
  const noLetter = await setClientPassword(request, subdomain, "12345678");
  expect(noLetter.status()).toBe(422);

  const after = await otpState(request, subdomain, email);
  expect(after.hasPassword).toBe(false);
});

test("an unauthenticated request to set password gets 401", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-noauth");

  const res = await setClientPassword(request, subdomain, "ValidPass1");
  expect(res.status()).toBe(401);
});

test("setting a password does NOT send a client_password_changed email", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-noemail");
  const email = uniqueEmail("parent");

  const code = await issueAndReadCode(request, subdomain, email);
  const verify = await verifyCode(request, subdomain, { email, code });
  expect(verify.ok()).toBe(true);

  const res = await setClientPassword(request, subdomain, "ValidPass1");
  expect(res.ok()).toBe(true);

  // Wait a moment then check: NO client-password-changed email should exist.
  // We use a short timeout and expect the poll to fail.
  let hasNotification = false;
  try {
    await waitForEmail(request, email, "client-password-changed", 3000);
    hasNotification = true;
  } catch {
    // Expected: no email sent
  }
  expect(hasNotification).toBe(false);
});

test("resetClientPassword revokes all sessions and emits notification", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-reset");
  const email = uniqueEmail("parent");

  const code = await issueAndReadCode(request, subdomain, email);
  const verify = await verifyCode(request, subdomain, { email, code });
  expect(verify.ok()).toBe(true);

  // First set a password so the client has one
  const set = await setClientPassword(request, subdomain, "OldPass1!");
  expect(set.ok()).toBe(true);

  const before = await otpState(request, subdomain, email);
  expect(before.hasPassword).toBe(true);
  expect(before.liveSessions).toBe(1);

  // Create a second session (sign in again in a different context — simulate
  // the client having two devices signed in). OTP codes are consumed, so we
  // need a fresh one.
  // Issue a new code, but since the client already exists and is verified,
  // `issueOtp` reuses the existing client row.
  const code2 = await issueAndReadCode(request, subdomain, email);
  const verify2 = await verifyCode(request, subdomain, { email, code: code2 });
  expect(verify2.ok()).toBe(true);

  const twoSessions = await otpState(request, subdomain, email);
  expect(twoSessions.liveSessions).toBe(2);

  // Reset password → all sessions revoked, notification emitted
  const reset = await resetPassword(request, subdomain, email);
  expect(reset.ok).toBe(true);
  expect(reset.revokedSessionCount).toBe(2);

  const after = await otpState(request, subdomain, email);
  expect(after.liveSessions).toBe(0);

  // Verify the notification email was sent
  const mail = await waitForEmail(request, email, "client-password-changed");
  expect(mail.subject).toContain("password");
});

test("set password requires isVerified=true (defense-in-depth)", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-unver");
  const email = uniqueEmail("parent");

  // Request a code to create the client row (US-4.1 upsert), but do NOT verify it
  await issueAndReadCode(request, subdomain, email);

  const state = await otpState(request, subdomain, email);
  expect(state.isVerified).toBe(false);

  // The client has no session (never verified), so the endpoint should return 401
  // because requireClient() throws — not 403 (which would need isVerified check).
  // This test confirms the general auth gate works.
  const res = await setClientPassword(request, subdomain, "ValidPass1");
  expect(res.status()).toBe(401);
});

test("skip password — hasPassword stays false", async ({ request }) => {
  const { subdomain } = await seedAcademy(request, "pw-skip");
  const email = uniqueEmail("parent");

  const code = await issueAndReadCode(request, subdomain, email);
  const verify = await verifyCode(request, subdomain, { email, code });
  expect(verify.ok()).toBe(true);

  // Just verify, don't set password — then check state
  const state = await otpState(request, subdomain, email);
  expect(state.isVerified).toBe(true);
  expect(state.hasPassword).toBe(false);
  expect(state.liveSessions).toBe(1);

  // Verify that OTP login still works (the client can still log in with a code)
  const code2 = await issueAndReadCode(request, subdomain, email);
  const verify2 = await verifyCode(request, subdomain, { email, code: code2 });
  expect(verify2.ok()).toBe(true);
});
