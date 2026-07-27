import type { RateLimitRule } from "@/lib/adapters/rate-limit";

/**
 * Rate-limit rules for public CMS contact form submissions.
 *
 * Per-email: primary limit — prevents flooding one inbox.
 * Per-IP: secondary, looser — stops a single host sweeping many addresses.
 */
export const CONTACT_FORM_EMAIL_RULE: RateLimitRule = { limit: 3, windowMs: 60 * 60 * 1000 };
export const CONTACT_FORM_IP_RULE: RateLimitRule = { limit: 5, windowMs: 60 * 60 * 1000 };
