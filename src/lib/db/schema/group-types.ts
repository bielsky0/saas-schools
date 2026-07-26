import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { location } from "./locations";
import { organization } from "./organizations";
import { policyDocument } from "./policy-documents";

/**
 * Group type — the DEFINITION half of langlion's first governing principle
 * (§0 Zasada nadrzędna #1, §1.2).
 *
 * A template: name, engine, price, payment policy, default location, which
 * purchase and billing modes are allowed. Editing it NEVER propagates backwards
 * into already-generated `session` rows, already-made `booking` rows, or a
 * purchase already in flight. That is why `booking` freezes its own
 * `priceSnapshot` instead of joining back to this table at read time.
 *
 * SCOPE OF `slug` (decyzja D10): unique per organization, not globally. It names
 * an offer *within* an academy — the public URL is
 * `{organization.subdomain}/zapisy/{slug}` — and two academies may both run an
 * "obozy-2026". Global uniqueness would collide between unrelated tenants and
 * leak that another academy's offer exists.
 *
 * Unions are stored as `text` per repo convention (no `pgEnum`), validated in
 * `features/groups/schema.ts`:
 *   engine         "schedule_first" | "availability_first" | "slot_first"
 *   paymentPolicy  "online" | "on_site" | "both"
 *   status         "scheduled" | "collecting_interest" (Faza 22, §2.34)
 *   purchase modes "single_class" | "package"
 *   billing types  "one_time" | "recurring"
 *
 * `policyDocumentId` (§2.18, F17) — optional FK to policy_document. Nullable:
 * no policy document means the acceptance step is skipped during enrollment.
 */
export const groupType = pgTable(
  "group_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /**
     * Markdown blurb shown to parents on the public offer page (§2.27, US-2.1/AC4).
     *
     * PURELY PRESENTATIONAL — nothing in the booking engine, the pricing path or
     * the signup validation reads it, and its absence means one section is not
     * rendered rather than an offer that cannot be published. It lives here from
     * Faza 2 because the group-type CRUD form is being built anyway; the page
     * that renders it belongs to EPIK 4.
     */
    description: text("description"),
    engine: text("engine")
      .$type<"schedule_first" | "availability_first" | "slot_first">()
      .notNull(),
    paymentPolicy: text("paymentPolicy").$type<"online" | "on_site" | "both">().notNull(),
    /**
     * Faza 22 (§2.34) — controls branching on the public enrollment page.
     * `scheduled` (default): the offer has a schedule — render the session calendar.
     * `collecting_interest`: no schedule yet — render the interest signup form instead.
     * Admin switches manually; no automation or threshold triggers.
     */
    status: text("status")
      .$type<"scheduled" | "collecting_interest">()
      .notNull()
      .default("scheduled"),
    /**
     * Minor units of `organization.currency` (§2.14) — grosze, not złote. Integer
     * throughout, matching what Stripe expects, so there is no rounding layer to
     * get wrong. Required with no default: an offer without a price is not an offer.
     */
    price: integer("price").notNull(),
    isNewClientOnly: boolean("isNewClientOnly").notNull().default(false),
    /** Empty/absent = every active trainer is eligible (§1.2). */
    eligibleTrainerIds: text("eligibleTrainerIds").array(),
    defaultLocationId: text("defaultLocationId"),
    /** At least one of "single_class" | "package"; enforced in the zod layer (US-23.1/AC1). */
    allowedPurchaseModes: text("allowedPurchaseModes")
      .array()
      .$type<("single_class" | "package")[]>()
      .notNull(),
    /** Required once "package" is allowed (US-23.2/AC1). */
    allowedBillingTypes: text("allowedBillingTypes").array().$type<("one_time" | "recurring")[]>(),
    /**
     * Current policy document assigned to this offer (F17, §2.18). Nullable:
     * no policy means the acceptance step is skipped during enrollment.
     * Editable separately from the atomic version-upload flow; see
     * `features/policies/actions.ts:uploadNewPolicyVersion`.
     */
    policyDocumentId: text("policyDocumentId"),
    /**
     * Faza 26 (§2.40, EPIK 41) — when true, this offer requires a qualification
     * card (karta kwalifikacyjna uczestnika wypoczynku). The enrollment flow
     * adds a card step between the consent step and the submit button; the
     * parent must complete phase 1 before the booking is created.
     */
    requiresQualificationCard: boolean("requires_qualification_card").notNull().default(false),
    /**
     * Default duration (minutes) and capacity for this group type (F17.5, EPIK 34).
     *
     * Used by the slot-availability layer (`computeAvailabilitySlots`) when
     * slicing trainer windows into bookable slots. Nullable — existing group
     * types keep NULL. The calling code falls back to `FALLBACK_DURATION_MINUTES`
     * (currently 60) when no value is set.
     *
     * These are defaults, not overrides: a specific `class_session`'s actual
     * duration and capacity are set when the session is created.
     *
     * TODO(F18/Slot-First): Slot-First engine consumes `defaultDurationMinutes`
     * and `defaultCapacity` as the session's initial values at creation time
     * (US-34.4).
     */
    defaultDurationMinutes: integer("defaultDurationMinutes"),
    defaultCapacity: integer("defaultCapacity"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"),
  },
  (t) => [
    unique("group_type_id_org_uq").on(t.id, t.organizationId),
    unique("group_type_org_slug_uq").on(t.organizationId, t.slug),
    // Composite: a group type's default location must belong to the same academy.
    foreignKey({
      columns: [t.defaultLocationId, t.organizationId],
      foreignColumns: [location.id, location.organizationId],
      name: "group_type_default_location_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [t.policyDocumentId, t.organizationId],
      foreignColumns: [policyDocument.id, policyDocument.organizationId],
      name: "group_type_policy_document_fk",
    }).onDelete("set null"),
    index("group_type_org_idx").on(t.organizationId),
  ],
);
