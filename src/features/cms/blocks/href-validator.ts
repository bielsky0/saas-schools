const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

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

export function safeHrefSchema() {
  return { safeHref: (v: string) => isAllowedUrl(v) || "Link URL must start with http://, https://, /, #, mailto:, or tel:" };
}
