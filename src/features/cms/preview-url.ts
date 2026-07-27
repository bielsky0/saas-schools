import { buildTenantOrigin, parseHost } from "@/lib/tenant-host";

/**
 * Build an absolute URL rooted at the tenant origin from a Host header.
 * Returns `null` when the request does not address a tenant host (apex/foreign).
 */
export function buildTenantOriginUrl(hostHeader: string, path: string): string | null {
  const rootDomain = process.env.APP_ROOT_DOMAIN || "localhost";
  const parsed = parseHost(hostHeader, rootDomain);
  if (parsed.kind !== "tenant") return null;
  const proto = process.env.NODE_ENV === "production" ? "https:" : "http:";
  const origin = buildTenantOrigin(parsed.subdomain, rootDomain, hostHeader, proto);
  return `${origin}${path}`;
}

/**
 * Build the draft-preview URL for a CMS page, usable from both
 * `admin.preview` (pages.ts) and `admin.livePreview.url` (payload-config.ts).
 *
 * Returns `null` when the request does not address a tenant host (apex/foreign).
 */
export function buildPreviewUrl(hostHeader: string, slug: string): string | null {
  const secret = process.env.PAYLOAD_DRAFT_SECRET || "";
  return buildTenantOriginUrl(hostHeader, `/api/draft?secret=${secret}&slug=${slug}`);
}
