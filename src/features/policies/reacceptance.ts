/**
 * Whether clients must re-accept the policy document when a new version is
 * published (US-28.3/AC2).
 *
 * Currently `false` pending legal confirmation — see:
 *   docs/plan/ryzyka-i-otwarte-pytania.md:18
 *
 * When switched to `true`, the enrollment flow will compare the group type's
 * current policy version against the client's last acceptance and force
 * re-acceptance before proceeding.
 */
export const REQUIRE_REACCEPTANCE_ON_VERSION_CHANGE = false;
