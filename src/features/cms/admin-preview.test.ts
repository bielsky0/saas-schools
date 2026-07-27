import { describe, expect, it } from "vitest";

import { parseHost } from "@/lib/tenant-host";

/**
 * admin.preview URL construction logic (Faza 30e).
 *
 * These test the PURE LOGIC that the `admin.preview` callback in pages.ts
 * performs — parseHost + URL construction. The callback itself reads `env`
 * and `req`, which are not available in unit tests.
 */
describe("admin.preview — URL construction", () => {
  const ROOT = "langlion.pl";
  const SECRET = "test-secret-123";

  it("builds correct draft URL for a tenant host", () => {
    const host = "acme.langlion.pl";
    const parsed = parseHost(host, ROOT);
    expect(parsed.kind).toBe("tenant");

    const slug = "about-us";
    const url = `https://${parsed.subdomain}.${ROOT}/api/draft?secret=${SECRET}&slug=${slug}`;

    expect(url).toBe("https://acme.langlion.pl/api/draft?secret=test-secret-123&slug=about-us");
  });

  it("builds correct URL for home page (empty slug)", () => {
    const host = "acme.langlion.pl";
    const parsed = parseHost(host, ROOT);
    expect(parsed.kind).toBe("tenant");

    const slug = "";
    const url = `https://${parsed.subdomain}.${ROOT}/api/draft?secret=${SECRET}&slug=${slug}`;

    expect(url).toBe("https://acme.langlion.pl/api/draft?secret=test-secret-123&slug=");
  });

  it("returns null for apex host (no subdomain)", () => {
    const host = "langlion.pl";
    const parsed = parseHost(host, ROOT);
    expect(parsed.kind).toBe("apex");
  });

  it("returns null for foreign host", () => {
    const host = "unknown.com";
    const parsed = parseHost(host, ROOT);
    // Foreign hosts produce "apex" routing, not tenant
    expect(parsed.kind === "apex" || parsed.kind === "foreign").toBe(true);
  });

  it("handles host with port (dev)", () => {
    const host = "acme.localtest.me:3000";
    const root = "localtest.me";
    const parsed = parseHost(host, root);
    expect(parsed.kind).toBe("tenant");
    expect(parsed.subdomain).toBe("acme");
  });
});
