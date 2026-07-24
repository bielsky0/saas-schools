/**
 * Stripe Connect-supported countries for Standard accounts (ISO 3166-1 alpha-2).
 * Sourced from https://stripe.com/docs/connect/supported-countries
 * Stripe rarely changes this list; updates are one commit when they do.
 *
 * This file has ZERO server-side dependencies (no logger, no db, no drizzle),
 * so it is safe to import from a `"use client"` component.
 */
export const SUPPORTED_CONNECT_COUNTRIES = [
  "AT", "AU", "BE", "BG", "CA", "CH", "CY", "CZ", "DE", "DK", "EE", "ES",
  "FI", "FR", "GB", "GR", "HK", "HR", "HU", "IE", "IT", "JP", "LT", "LU",
  "LV", "MT", "MY", "NL", "NO", "NZ", "PL", "PT", "RO", "SE", "SG", "SI",
  "SK", "US",
] as const;

export type SupportedCountry = (typeof SUPPORTED_CONNECT_COUNTRIES)[number];

export function isSupportedCountry(value: string): value is SupportedCountry {
  return (SUPPORTED_CONNECT_COUNTRIES as readonly string[]).includes(value);
}
