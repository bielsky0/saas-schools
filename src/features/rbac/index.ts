/**
 * RBAC feature module (spec 4 — role-based access control).
 *
 * The centralized role → permissions map (spec 4.1): the SINGLE source of truth
 * for what each predefined role may do, so authorization is never scattered
 * across components. Enforcement is on the backend (spec 4.2) — see
 * `requireOrgPermission` in `features/organizations/context.ts`, which reads this
 * map and calls Next's `forbidden()` (403) when a permission is missing. UI
 * hiding/disabling uses `hasPermission` cosmetically only.
 *
 * Predefined roles only for this phase; custom per-org roles (§4.3) are a future
 * extension that would layer a DB-backed role→permission map over this same shape.
 */

/**
 * Predefined roles, lowest to highest privilege.
 *
 * The three langlion staff roles (§2.10) sit between `member` and `admin`, and
 * the ordering is a documentation convenience only — nothing computes privilege
 * from the array index. They are SIDEWAYS from each other, not a ladder:
 * reception handles money at the desk, a trainer handles their own sessions, the
 * secretariat handles client requests. Each gets exactly the permissions §2.10
 * names for it and nothing by inheritance.
 *
 * Roles stay STATIC here rather than becoming DB-backed rows (Rozstrzygnięcie #4
 * in docs/plan-implementacji.md). A custom-role mechanism (boilerplate §4.3)
 * would layer over this same shape later without a data migration, because the
 * `membership.role` column already stores the name as text.
 */
export const ROLES = ["member", "trainer", "reception", "secretariat", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Atomic permissions — discrete actions a role may perform. Add new capabilities
 * here and grant them in `ROLE_PERMISSIONS`; never inline a role check elsewhere.
 */
export type Permission =
  | "members.invite"
  | "members.remove"
  | "members.update_role"
  | "invitations.revoke"
  | "organization.update"
  | "organization.delete"
  | "organization.leave"
  | "storage.upload"
  | "storage.delete"
  | "audit.read"
  | "billing.manage"
  // ── Faza 10 — Stripe Connect per organization (EPIK 30) ──────────────────
  //
  /** Connect/disconnect the organization's own Stripe account (owner-only). */
  | "billing_connect.manage"
  // ── langlion domain permissions (§2.10) ──────────────────────────────────
  //
  // FIRST BATCHES ONLY — the ones a phase actually enforces at a call site. The spec's §2.10 table
  // names roughly twenty; they arrive with the phase that has a call site to
  // guard, because a permission granted before anything checks it is
  // indistinguishable from one that was forgotten.
  | "locations.manage"
  | "group_types.manage"
  | "sessions.generate_season"
  | "sessions.manage"
  /**
   * Creating settlement value out of nothing (§2.4, US-7.3). Owner+Admin only,
   * and paired in the action with a REQUIRED reason — the permission answers
   * "who may", the reason answers "why", and the audit trail needs both.
   */
  | "credits.manual_grant"
  // ── Faza 6 — panel trenera i recepcji (§2.10, §2.29/EPIK 31, §2.33/EPIK 35) ──
  //
  /** Confirm a cash payment at the desk (US-6.1). Trainer + reception, on equal
   * footing — either may take payment on the spot; there is no cash-drawer
   * distinction between the two roles in this spec. */
  | "credits.confirm_on_site"
  /** Mark a booking's attendance (§2.29, EPIK 31). "Own sessions only" for a
   * trainer cannot be expressed by this map — enforced at the action call site
   * by comparing `classSession.trainerId` to the caller. */
  | "bookings.mark_attendance"
  // ── Faza 7 — anulowanie rezerwacji i sesji (§2.10, EPIK 12, US-19.2) ──
  //
  /** Anulowanie rezerwacji klienta (US-12.2) lub całej sesji (US-19.2).
   * Secretariat i reception mogą anulować w imieniu akademii; trainer — nie
   * (tylko własne sesje i obecność). */
  | "bookings.cancel_reschedule"
  /** Define grade_field rows, per group_type or ad-hoc per session (§2.33, EPIK 35). */
  | "grade_fields.manage"
  /** Enter/overwrite a grade or progress note (§2.33, EPIK 35). Same "own
   * sessions only" enforcement as `bookings.mark_attendance` for a trainer. */
  | "grades.enter"
  // ── Faza 8 — soft delete domenowy + reasygnacje (§2.11, EPIK 20, 21) ──────────
  //
  /** Dezaktywacja profilu trenera — offboarding (§2.11). Owner+Admin tylko. */
  | "trainers.offboard"
  /** Masowa zmiana trenera dla wielu przyszłych sesji (§2.11, US-21.3). Owner+Admin. */
  | "sessions.mass_reassign_trainer"
  /** Mass Move Bookings — przeniesienie uczestników odwoływanej sesji na inną
   * (§2.11, US-21.4). Owner+Admin. */
  | "sessions.mass_move_bookings"
  /** Dezaktywacja Definicji (group_type) — blokowana przy aktywnych zależnościach
   * (§2.11, US-21.6). Owner+Admin. */
  | "group_types.deactivate"
  // ── Faza 12 — Pakiety i subskrypcje (§2.13, EPIK 9/10) ──
  //
  /** Confirm a cash package purchase at the desk (US-10.x). Reception sells
   * packages against cash; credits are issued and auto-filled in one transaction. */
  | "credits.purchase_cash"
  // ── Faza 15 — Group swap + credit transfer (EPIK 11, US-7.5) ────────
  //
  /** Zatwierdzanie wniosków o zmianę grupy (Owner, Admin, Sekretariat). */
  | "group_swap.approve"
  /** Reasygnacja kredytu między dziećmi tego samego rodzica (Owner, Admin, Sekretariat). */
  | "credits.reassign_athlete"
  // ── Faza 16 — Zwroty fiducjarne (EPIK 18) ────────────────────────────
  //
  /** Initiate and confirm refunds (Owner, Admin, Sekretariat). */
  | "refunds.issue"
  // ── Faza 17.5 — Dyspozycyjność trenerów (EPIK 34) ────────────────────
  //
  /** Manage trainer availability windows (owner, admin, or trainer own only). */
  | "trainer_availability.manage"
  // ── Faza 18 — Force Override (EPIK 14.5) ─────────────────────────────
  //
  /** Bypass trainer conflict in Schedule-First only. NEVER overrides capacity.
   * Owner+Admin only, per §2.10. Does NOT set `isManuallyAdjusted`. */
  | "sessions.force_override"
  // ── Faza 19 — Fakturowanie ręczne (EPIK 27) ─────────────────────────
  //
  /** Mark a manually-issued invoice as settled (US-27.2/AC2). */
  | "invoices.mark_issued"
  // ── Faza 20 — Wynagrodzenia trenerów (EPIK 32, §2.30) ──────────────
  //
  /** CRUD on trainer_rate (§2.30). Owner+Admin only — a trainer never edits
   * their own rate. */
  | "trainer_rates.manage"
  /** View the earnings report (§2.30). Owner+Admin see all; Trainer sees
   * own data only, enforced on the backend regardless of UI. */
  | "trainer_earnings.view"
  // ── Faza 21 — Indywidualne ceny klienta (EPIK 33, §2.31) ────────────
  //
  /** Grant/revoke individual client price overrides. Owner+Admin only, and
   * paired in the action with a REQUIRED reason — same pattern as
   * `credits.manual_grant` (§2.10). */
  | "client_price_override.manage"
  // ── Faza 22 — Zapisy-zainteresowanie (EPIK 36, §2.34) ─────────────
  //
  /** View interest signups and convert them to real bookings through full §5
   * protection. Owner, Admin, Sekretariat — same group as `group_swap.approve`
   * (§2.10). */
  | "interest.manage"
  // ── Faza 23 — Granular permission overrides (EPIK 38, §2.36) ──────────
  //
  /** Grant/revoke individual permission overrides on a membership. Owner+Admin
   * only. This permission itself is NOT overridable — see
   * `computeEffectivePermissions`. */
  | "member_permissions.manage"
  // ── Faza 24 — Profil uczestnika: zgody, dane zdrowotne (EPIK 37, §2.35) ──
  //
  /** CRUD versioned consent documents (consent_document, §2.35). Owner+Admin only,
   * same authority level as managing policy_document. */
  | "consent_documents.manage"
  /** View sensitive athlete data (health_notes, emergency_contact). Owner, Admin,
   * Reception — wide scope per user decision (pre-F24). Trainer does NOT get this
   * by default; can be granted via permission override from F23. */
  | "athlete_health.view"
  // ── Faza 25 — Import masowy CSV przy onboardingu (EPIK 39, §2.38) ──
  //
  /** Bulk-import parents and children from a single CSV file during onboarding.
   * Owner+Admin only — this is an admin tool for migrating an existing academy
   * database, not a self-serve feature. */
  | "data.import";

/**
 * role → permissions. Owner is a superset; Admin manages members; Member reads.
 *
 * The five langlion permissions are Owner+Admin only, exactly as §2.10 lists
 * them. Note what is deliberately absent from every row: there is no
 * "exceed session capacity" permission and there never will be (US-17.1/AC2) —
 * capacity is guarded by a row lock in a transaction (§5.2), not by a role, so a
 * permission that claimed to override it would be a lie the database refuses to
 * honour. Trainer conflict is the opposite case and gets `sessions.force_override`
 * in F18; capacity gets nothing, ever.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    "members.invite",
    "members.remove",
    "members.update_role",
    "invitations.revoke",
    "organization.update",
    "organization.delete",
    "organization.leave",
    "storage.upload",
    "storage.delete",
    "audit.read",
    "billing.manage",
    "billing_connect.manage",
    "locations.manage",
    "group_types.manage",
    "group_types.deactivate",
    "sessions.generate_season",
    "sessions.manage",
    "sessions.mass_reassign_trainer",
    "sessions.mass_move_bookings",
    "credits.manual_grant",
    "credits.confirm_on_site",
    "bookings.cancel_reschedule",
    "bookings.mark_attendance",
    "grade_fields.manage",
    "grades.enter",
    "trainers.offboard",
    "credits.purchase_cash",
    "group_swap.approve",
    "credits.reassign_athlete",
    "refunds.issue",
    "trainer_availability.manage",
    "sessions.force_override",
    "invoices.mark_issued",
    "trainer_rates.manage",
    "trainer_earnings.view",
    "client_price_override.manage",
    "interest.manage",
    "member_permissions.manage",
    "consent_documents.manage",
    "athlete_health.view",
    "data.import",
  ],
  // Admin manages people and settings, but NOT money.
  //
  // `billing.manage` is owner-only alongside `organization.delete`: it authorizes
  // spending the organization's money and changing what it owes every month,
  // which is a different kind of authority from managing colleagues. Chosen as
  // the conservative default because the spec gives no guidance (§4.1 only names
  // the permission) — widening it later is one line, while narrowing it after
  // admins rely on it is a breaking change.
  admin: [
    "members.invite",
    "members.remove",
    "members.update_role",
    "invitations.revoke",
    "organization.update",
    "organization.leave",
    "storage.upload",
    "storage.delete",
    "audit.read",
    "locations.manage",
    "group_types.manage",
    "group_types.deactivate",
    "sessions.generate_season",
    "sessions.manage",
    "sessions.mass_reassign_trainer",
    "sessions.mass_move_bookings",
    "credits.manual_grant",
    "credits.confirm_on_site",
    "bookings.cancel_reschedule",
    "bookings.mark_attendance",
    "grade_fields.manage",
    "grades.enter",
    "trainers.offboard",
    "credits.purchase_cash",
    "group_swap.approve",
    "credits.reassign_athlete",
    "refunds.issue",
    "trainer_availability.manage",
    "sessions.force_override",
    "invoices.mark_issued",
    "trainer_rates.manage",
    "trainer_earnings.view",
    "client_price_override.manage",
    "interest.manage",
    "member_permissions.manage",
    "consent_documents.manage",
    "athlete_health.view",
    "data.import",
  ],
  /**
   * The three langlion staff roles (§2.10).
   *
   * They exist ahead of most of their permissions, on purpose: `membership.role`
   * is a text column, so a role that does not exist in this map fails `isRole`
   * and lands the holder on a 403 for the entire organization
   * (`requireOrgAccess`). Introducing the names in the phase that invites them,
   * and each grant in the phase that enforces it, keeps those two failure modes
   * apart — an unrecognised role is a locked-out human, a missing permission is
   * one refused button.
   *
   * Faza 6 grants (this phase): `credits.confirm_on_site` to trainer + reception
   * (either may take cash at the desk); `bookings.mark_attendance` and
   * `grades.enter` to trainer only among these three (own sessions only,
   * enforced at the action call site — this map cannot express "own");
   * `grade_fields.manage` to trainer only (defining the e-dziennik's fields is
   * the same authority as entering values into them).
   *
    * Faza 7 grants (this phase): `bookings.cancel_reschedule` to secretariat + reception
    * (either may cancel individual bookings or full sessions on behalf of the academy);
    * NOT to trainer — cancellation is not the same as marking own-session attendance.
    *
     * Faza 12 grants: `credits.purchase_cash` to reception (reception sells packages
     * against cash at the desk).
     *
     * Faza 15 grants: `group_swap.approve` and `credits.reassign_athlete` to
     * secretariat (alongside owner + admin).
     */
    secretariat: [
      "organization.leave",
      "storage.upload",
      "bookings.cancel_reschedule",
      "group_swap.approve",
      "credits.reassign_athlete",
      "refunds.issue",
      "invoices.mark_issued",
      "interest.manage",
    ],
  reception: [
    "organization.leave",
    "storage.upload",
    "credits.confirm_on_site",
    "bookings.cancel_reschedule",
    "credits.purchase_cash",
    "invoices.mark_issued",
    "athlete_health.view",
  ],
  trainer: [
    "organization.leave",
    "storage.upload",
    "credits.confirm_on_site",
    "bookings.mark_attendance",
    "grade_fields.manage",
    "grades.enter",
    // trainer_availability.manage is scoped to OWN windows only at the
    // action call site (compare trainerId to caller.userId). This map
    // cannot express "own" — see comment at bookings.mark_attendance.
    "trainer_availability.manage",
    // trainer_earnings.view is scoped to OWN data only at the action call site
    // (compare trainerId to caller.userId). This map cannot express "own" —
    // see comment at bookings.mark_attendance.
    "trainer_earnings.view",
  ],
  // Members may upload content, but not delete other people's files.
  //
  // NOT granted `audit.read` (§6.4): the trail records who removed whom and whose
  // role changed, which is management information about colleagues rather than
  // content. Owner/Admin are the roles accountable for those actions and so the
  // ones with standing to review them.
  member: ["organization.leave", "storage.upload"],
};

/** True if `role` grants `permission`. Pure — safe for both UI and backend use. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Narrow an arbitrary string (e.g. a DB `role` column) to a known `Role`. */
export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** All known permission keys, for validating override inputs. */
const ALL_PERMISSION_KEYS = new Set(
  Object.values(ROLE_PERMISSIONS).flat(),
);

/** Narrow an arbitrary string to a known Permission. Fail-closed: unknown keys are
 * not permissions and an override on one must be silently ignored. */
export function isPermissionKey(key: string): key is Permission {
  return ALL_PERMISSION_KEYS.has(key as Permission);
}

/**
 * Shape of a single override row from the database, as consumed by
 * `computeEffectivePermissions`. Deliberately minimal — the function does not
 * need the id, org, or timestamps to resolve the effective set.
 */
export type OverrideRow = {
  permissionKey: string;
  overrideType: "grant" | "revoke";
};

/**
 * Resolve the effective permission set for a membership (Faza 23, §2.36).
 *
 * Starts from the static ROLE_PERMISSIONS[role] base, then applies each
 * override: grant adds, revoke removes.
 *
 * TWO HARDENING RULES, both defense-in-depth (also enforced at the write gate
 * in the data layer, but repeated here so that an override that reaches the DB
 * through a bug or a direct INSERT is still harmless):
 *
 * 1. Owner memberships are immune — always return the full base set with no
 *    override applied. An Admin must not be able to revoke the Owner's
 *    member_permissions.manage (or any other permission).
 * 2. member_permissions.manage is NEVER influenced by an override, on any role.
 *    Allowing it would open an escalation chain: Admin grants reception the
 *    permission to manage overrides → reception grants itself everything else.
 *
 * @param role   The member's base role from membership.role.
 * @param overrides  Rows from membership_permission_override for this membership.
 * @returns The effective set — all permissions the member currently holds.
 */
export function computeEffectivePermissions(
  role: Role,
  overrides: readonly OverrideRow[],
): ReadonlySet<Permission> {
  if (role === "owner") {
    return new Set(ROLE_PERMISSIONS["owner"]);
  }

  const effective = new Set(ROLE_PERMISSIONS[role]);

  for (const ov of overrides) {
    if (ov.permissionKey === "member_permissions.manage") continue;
    if (!isPermissionKey(ov.permissionKey)) continue;

    if (ov.overrideType === "grant") {
      effective.add(ov.permissionKey);
    } else {
      effective.delete(ov.permissionKey);
    }
  }

  return effective;
}

/**
 * All permission keys that are valid targets for an override — every known
 * Permission EXCEPT member_permissions.manage, which is never overridable.
 * Used by the admin UI to populate the permission-key dropdown.
 */
export const OVERRIDABLE_PERMISSIONS: Permission[] = [...ALL_PERMISSION_KEYS].filter(
  (k) => k !== "member_permissions.manage",
).sort() as Permission[];
