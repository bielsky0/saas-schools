import { env } from "@/lib/env/server";

/**
 * Whether Stripe is running against TEST-mode keys (Faza 5.2).
 *
 * Derived automatically from the STRIPE_SECRET_KEY prefix (`sk_test_`), which is
 * how Stripe marks test keys. `env.STRIPE_TEST_MODE` can override that heuristic
 * for setups where the prefix is not authoritative (e.g. an agent/relay key).
 *
 * Both the "Connect Stripe" panel and the billing page use this to warn that
 * traffic is test traffic and money is not really moving.
 */
export function isStripeTestMode(): boolean {
  const override = env.STRIPE_TEST_MODE;
  if (override !== undefined) return override;
  return (env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
