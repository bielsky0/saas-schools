const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const MEETING_PROTOCOLS = new Set(["https:"]);

export function isAllowedUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("#")) return true;
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Stricter variant for meeting URLs — only absolute HTTPS is allowed.
 * mailto:, tel:, and relative paths make no sense for a meeting link.
 * null/empty passes through (field is optional).
 */
export function isAllowedMeetingUrl(url: string | null): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return MEETING_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function safeHrefSchema() {
  return { safeHref: (v: string) => isAllowedUrl(v) || "Link URL must start with http://, https://, /, #, mailto:, or tel:" };
}
