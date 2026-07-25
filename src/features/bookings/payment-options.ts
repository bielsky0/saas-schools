/**
 * What a parent may pay with, for one offer (F5; §2.13, §2.25, US-4.4, US-23.4).
 *
 * Pure and unit-tested, because this is a MATRIX and matrices are where a browser
 * test proves one cell and leaves five unproven. Three independent facts decide
 * the answer:
 *   1. `allowedPurchaseModes` — may this offer be bought one class at a time at
 *      all, or only as a package? (§2.13)
 *   2. `paymentPolicy` — which methods has the academy chosen to accept? (§1.2)
 *   3. `onlineAvailable` — can online payments physically be taken right now?
 *
 * FACT 3 IS NOT FACT 2, and conflating them is the mistake this shape exists to
 * prevent. "The academy does not accept online payment" is a settled decision and
 * the option should simply not appear (US-4.4/AC3). "The academy accepts it but
 * Stripe is not connected" is a temporary state with a fix, so the option appears
 * DISABLED with a reason — the same treatment §2.25 already specifies for the
 * admin side of Constraint 7. Different facts, different copy.
 *
 * In F5 `onlineAvailable` is always `false`: Stripe Connect is F10 and the online
 * checkout is F11, so no organisation can take a card yet. It is a parameter
 * rather than a hardcoded branch precisely so those phases change a call site and
 * not this logic.
 *
 * Faza 19 extends this with `allowedBillingTypes` and a package-teaser list.
 * When the offer includes `package` mode AND packages exist, the view carries
 * the filtered list of product templates the client may buy.
 */

/**
 * A minimal package teaser — what the enrollment form needs to render.
 * Extended from `product_template` joined with `group_type`.
 */
export interface PackageTeaser {
  id: string;
  name: string;
  price: number;
  creditQuantity: number;
  billingType: "one_time" | "recurring";
}

/** The subset of `group_type` this decision reads. */
export interface OfferPaymentInput {
  paymentPolicy: "online" | "on_site" | "both";
  allowedPurchaseModes: readonly ("single_class" | "package")[];
  /** Nullable for backward compat — F12 phases set it, earlier callers leave undefined. */
  allowedBillingTypes?: readonly ("one_time" | "recurring")[] | null;
}

export type PaymentMethodView =
  | { method: "on_site"; enabled: true }
  | { method: "online"; enabled: true }
  | { method: "online"; enabled: false; reason: "online_unavailable" };

export type PaymentOptionsView =
  /** Only sold as a package, and packages exist to buy. */
  | { kind: "packages_only" }
  /** Only sold as a package, but no active templates exist (US-23.4/AC1, F12e). */
  | { kind: "no_packages_available" }
  /**
   * Both single_class and packages are available. The form shows two paths and
   * the package list is filtered by allowedBillingTypes.
   * Faza 19: replaces the old `packages_only` for mixed-mode offers.
   */
  | { kind: "mixed_mode"; packages: PackageTeaser[]; methods: PaymentMethodView[] }
  /**
   * Only sold as a package, packages exist, and are rendered inline.
   * Faza 19: richer than the old `packages_only` notice — now carries the
   * actual filtered package teasers.
   */
  | { kind: "packages_available"; packages: PackageTeaser[] }
  /** The policy allows only online, and online cannot be taken right now. */
  | { kind: "none_available" }
  | { kind: "options"; methods: PaymentMethodView[] };

export function paymentOptionsFor(
  offer: OfferPaymentInput,
  context: {
    onlineAvailable: boolean;
    hasActivePackages?: boolean;
    packages?: PackageTeaser[];
  },
): PaymentOptionsView {
  const hasSingleClass = offer.allowedPurchaseModes.includes("single_class");
  const hasPackage = offer.allowedPurchaseModes.includes("package");
  const packages = context.packages ?? [];
  const hasActivePkgs = context.hasActivePackages !== false && packages.length > 0;

  // ── Filter packages by allowedBillingTypes (US-23.3, Faza 19) ──────────
  const filteredPackages = offer.allowedBillingTypes
    ? packages.filter((p) => offer.allowedBillingTypes!.includes(p.billingType))
    : packages;

  const hasFilteredPkgs = filteredPackages.length > 0;

  /*
   * Package-only offer: no single-class path, but packages may exist.
   * US-23.4/AC1 (F12e): no active templates at all → no_packages_available.
   * Faza 19: when filtered packages exist, return packages_available with
   * the actual teasers; when none survive billing-type filtering, still show
   * no_packages_available (same message — two distinct causes, same UX for
   * the parent; logged as warn server-side in the enrollment page).
   */
  if (!hasSingleClass) {
    if (!hasActivePkgs) {
      return { kind: "no_packages_available" };
    }
    if (!hasFilteredPkgs) {
      return { kind: "no_packages_available" };
    }
    return { kind: "packages_available", packages: filteredPackages };
  }

  const methods: PaymentMethodView[] = [];

  // On-site never depends on Stripe (§2.25): a new academy sells from day one,
  // while its Connect onboarding is still in progress.
  if (offer.paymentPolicy === "on_site" || offer.paymentPolicy === "both") {
    methods.push({ method: "on_site", enabled: true });
  }

  if (offer.paymentPolicy === "online" || offer.paymentPolicy === "both") {
    methods.push(
      context.onlineAvailable
        ? { method: "online", enabled: true }
        : { method: "online", enabled: false, reason: "online_unavailable" },
    );
  }

  // Mixed-mode: both single_class and packages available.
  if (hasPackage && hasFilteredPkgs) {
    return { kind: "mixed_mode", packages: filteredPackages, methods };
  }

  /*
   * An online-only offer with online switched off. Reachable in F5 for every such
   * offer, and NO acceptance criterion covered it — the spec assumed online would
   * exist by the time a public form did. Returning `options` with a single
   * disabled entry would render a form whose button can never be pressed and whose
   * page never says why; falling back to on-site would override a policy the
   * academy deliberately set. So it is its own state with its own message.
   */
  if (!methods.some((entry) => entry.enabled)) {
    return { kind: "none_available" };
  }

  return { kind: "options", methods };
}

/**
 * Whether any booking at all can be made — the calendar and the submit hang off this.
 * Faza 19: mixed_mode is also bookable (single-class path still works alongside packages).
 */
export function isBookable(
  view: PaymentOptionsView,
): view is { kind: "options"; methods: PaymentMethodView[] } | { kind: "mixed_mode"; packages: PackageTeaser[]; methods: PaymentMethodView[] } {
  return view.kind === "options" || view.kind === "mixed_mode";
}

/**
 * Backend enforcement of a chosen method (F5 decision; extends Constraint 7).
 *
 * The UI rules above are cosmetic, in the same sense §2.25 and §4.2 mean it: they
 * decide what is rendered, and the backend decides what is allowed. This is the
 * function `create.ts` calls, and it closes two gaps the presentation rules
 * cannot:
 *   - a request made directly against the API, with no form involved;
 *   - a race in which the academy's ability to take online payments changes while
 *     a parent is filling in the form.
 * Both end in the same place: the method must be in the policy AND actually
 * available at the moment of the write, not at the moment of the render.
 */
export function isMethodAcceptable(
  offer: OfferPaymentInput,
  method: "online" | "on_site",
  context: { onlineAvailable: boolean },
): boolean {
  const view = paymentOptionsFor(offer, context);
  if (view.kind !== "options" && view.kind !== "mixed_mode") return false;
  const methods = view.kind === "mixed_mode" ? view.methods : view.methods;
  return methods.some((entry) => entry.method === method && entry.enabled);
}
