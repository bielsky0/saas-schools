import { describe, expect, it } from "vitest";

import { isBookable, isMethodAcceptable, paymentOptionsFor } from "./payment-options";
import type { OfferPaymentInput, PackageTeaser } from "./payment-options";

/**
 * The payment matrix (US-4.4/AC1–AC4, US-23.4/AC1, §2.25).
 *
 * Unit-tested rather than clicked, because it is 3 policies × 2 purchase modes ×
 * 2 availability states and a browser test would prove one corner of it. The e2e
 * suite checks that the page RENDERS what this decides; this file checks that
 * what it decides is right.
 */

const singleClassBoth: OfferPaymentInput = {
  paymentPolicy: "both",
  allowedPurchaseModes: ["single_class"],
};

const packagesSample: PackageTeaser[] = [
  { id: "p1", name: "10-pack", price: 10000, creditQuantity: 10, billingType: "one_time" },
  { id: "p2", name: "Monthly", price: 4000, creditQuantity: 4, billingType: "recurring" },
];

/** F5's real state: Stripe Connect is F10, online checkout is F11. */
const F5 = { onlineAvailable: false };
/** What F10/F11 will pass, proving this logic needs no change then. */
const CONNECTED = { onlineAvailable: true };

describe("paymentOptionsFor — purchase mode gate", () => {
  it("returns packages_available for a package-only offer with active templates", () => {
    for (const policy of ["on_site", "online", "both"] as const) {
      expect(
        paymentOptionsFor(
          { paymentPolicy: policy, allowedPurchaseModes: ["package"] },
          { ...F5, packages: packagesSample },
        ),
      ).toEqual({ kind: "packages_available", packages: packagesSample });
    }
  });

  it("returns no_packages_available for a package-only offer with no packages", () => {
    expect(
      paymentOptionsFor({ paymentPolicy: "both", allowedPurchaseModes: ["package"] }, F5),
    ).toEqual({ kind: "no_packages_available" });
  });

  it("returns mixed_mode when both modes and packages exist", () => {
    const view = paymentOptionsFor(
      { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class", "package"] },
      { ...F5, packages: packagesSample },
    );
    expect(view).toEqual({
      kind: "mixed_mode",
      packages: packagesSample,
      methods: [{ method: "on_site", enabled: true }],
    });
  });

  it("falls to options when both modes exist but no packages are active", () => {
    const view = paymentOptionsFor(
      { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class", "package"] },
      F5,
    );
    expect(view).toEqual({
      kind: "options",
      methods: [{ method: "on_site", enabled: true }],
    });
  });

  it("allows single-class purchase when the offer permits both modes", () => {
    const view = paymentOptionsFor(
      { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class", "package"] },
      { ...F5, packages: packagesSample },
    );
    expect(view.kind).toBe("mixed_mode");
  });
});

describe("paymentOptionsFor — allowedBillingTypes filter", () => {
  it("filters packages by allowedBillingTypes (US-23.3)", () => {
    const view = paymentOptionsFor(
      {
        paymentPolicy: "both",
        allowedPurchaseModes: ["package"],
        allowedBillingTypes: ["one_time"],
      },
      { ...F5, packages: packagesSample },
    );
    expect(view).toEqual({
      kind: "packages_available",
      packages: [packagesSample[0]],
    });
  });

  it("returns no_packages_available when filter leaves no packages", () => {
    const view = paymentOptionsFor(
      {
        paymentPolicy: "both",
        allowedPurchaseModes: ["package"],
        allowedBillingTypes: [],
      },
      { ...F5, packages: packagesSample },
    );
    expect(view).toEqual({ kind: "no_packages_available" });
  });

  it("mixed_mode also filters packages by allowedBillingTypes", () => {
    const view = paymentOptionsFor(
      {
        paymentPolicy: "both",
        allowedPurchaseModes: ["single_class", "package"],
        allowedBillingTypes: ["recurring"],
      },
      { ...CONNECTED, packages: packagesSample },
    );
    expect(view).toEqual({
      kind: "mixed_mode",
      packages: [packagesSample[1]],
      methods: [
        { method: "on_site", enabled: true },
        { method: "online", enabled: true },
      ],
    });
  });
});

describe("paymentOptionsFor — policy decides which methods appear at all", () => {
  it("omits online entirely when the academy does not accept it (US-4.4/AC3)", () => {
    const view = paymentOptionsFor(
      { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class"] },
      CONNECTED,
    );
    expect(view).toEqual({ kind: "options", methods: [{ method: "on_site", enabled: true }] });
  });

  it("omits on-site when the academy does not accept it", () => {
    const view = paymentOptionsFor(
      { paymentPolicy: "online", allowedPurchaseModes: ["single_class"] },
      CONNECTED,
    );
    expect(view).toEqual({ kind: "options", methods: [{ method: "online", enabled: true }] });
  });
});

describe("paymentOptionsFor — availability is a different fact from policy", () => {
  it("renders online DISABLED with a reason when the policy allows it but it cannot be taken", () => {
    expect(paymentOptionsFor(singleClassBoth, F5)).toEqual({
      kind: "options",
      methods: [
        { method: "on_site", enabled: true },
        { method: "online", enabled: false, reason: "online_unavailable" },
      ],
    });
  });

  it("enables online once it becomes available, with no other change", () => {
    expect(paymentOptionsFor(singleClassBoth, CONNECTED)).toEqual({
      kind: "options",
      methods: [
        { method: "on_site", enabled: true },
        { method: "online", enabled: true },
      ],
    });
  });

  it("reports none_available for an online-only offer while online is off", () => {
    expect(
      paymentOptionsFor({ paymentPolicy: "online", allowedPurchaseModes: ["single_class"] }, F5),
    ).toEqual({ kind: "none_available" });
  });

  it("still offers on-site for a both-policy offer while online is off", () => {
    const view = paymentOptionsFor(singleClassBoth, F5);
    expect(isBookable(view)).toBe(true);
  });
});

describe("isBookable", () => {
  it("is true for options and mixed_mode, false for package-only refusals", () => {
    expect(isBookable(paymentOptionsFor(singleClassBoth, F5))).toBe(true);
    expect(
      isBookable(
        paymentOptionsFor({ paymentPolicy: "both", allowedPurchaseModes: ["package"] }, F5),
      ),
    ).toBe(false);
    expect(
      isBookable(
        paymentOptionsFor(
          { paymentPolicy: "both", allowedPurchaseModes: ["package"] },
          { ...F5, packages: packagesSample },
        ),
      ),
    ).toBe(false); // packages_available is NOT bookable via calendar
    expect(
      isBookable(
        paymentOptionsFor({ paymentPolicy: "online", allowedPurchaseModes: ["single_class"] }, F5),
      ),
    ).toBe(false);
    // mixed_mode IS bookable (single-class path is still available)
    expect(
      isBookable(
        paymentOptionsFor(
          { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class", "package"] },
          { ...F5, packages: packagesSample },
        ),
      ),
    ).toBe(true);
  });
});

describe("isMethodAcceptable — the backend gate (extends Constraint 7)", () => {
  it("accepts a method that is both in policy and available", () => {
    expect(isMethodAcceptable(singleClassBoth, "on_site", F5)).toBe(true);
    expect(isMethodAcceptable(singleClassBoth, "online", CONNECTED)).toBe(true);
  });

  it("refuses a method outside the offer's policy, however it was requested", () => {
    expect(
      isMethodAcceptable(
        { paymentPolicy: "on_site", allowedPurchaseModes: ["single_class"] },
        "online",
        CONNECTED,
      ),
    ).toBe(false);
    expect(
      isMethodAcceptable(
        { paymentPolicy: "online", allowedPurchaseModes: ["single_class"] },
        "on_site",
        CONNECTED,
      ),
    ).toBe(false);
  });

  it("refuses online when it is in policy but unavailable — the race case", () => {
    expect(isMethodAcceptable(singleClassBoth, "online", F5)).toBe(false);
  });

  it("refuses every method for a package-only offer", () => {
    const packageOnly: OfferPaymentInput = {
      paymentPolicy: "both",
      allowedPurchaseModes: ["package"],
    };
    expect(isMethodAcceptable(packageOnly, "on_site", CONNECTED)).toBe(false);
    expect(isMethodAcceptable(packageOnly, "online", CONNECTED)).toBe(false);
  });

  it("accepts methods in mixed_mode", () => {
    expect(
      isMethodAcceptable(
        { paymentPolicy: "both", allowedPurchaseModes: ["single_class", "package"] },
        "on_site",
        CONNECTED,
      ),
    ).toBe(true);
  });
});
