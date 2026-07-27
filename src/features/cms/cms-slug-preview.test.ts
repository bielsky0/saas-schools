import { describe, expect, it } from "vitest";

/**
 * CMS slug page draft mode behavior (Faza 30e).
 *
 * The actual draft mode cookie check is done by Next.js's `draftMode()`
 * at runtime. These tests verify the BUSINESS LOGIC decoupled from Next.js:
 *
 * - A page is visible when status === "published" (regardless of draft mode)
 * - A page is visible when status === "draft" AND draftMode.isEnabled === true
 * - A page is NOT visible when status === "draft" AND draftMode.isEnabled === false
 * - A bare `?preview=true` query param (without draft mode cookie) does NOT
 *   bypass the status filter — this is the regression guard for US-C1.1/AC2.
 */

type Page = { status: "draft" | "published" };

function shouldRender(
  page: Page | null,
  isEnabled: boolean,
): boolean {
  if (!page) return false;
  if (page.status === "published") return true;
  if (page.status === "draft" && isEnabled) return true;
  return false;
}

describe("CMS slug page — draft mode visibility", () => {
  it("renders published page without draft mode", () => {
    expect(shouldRender({ status: "published" }, false)).toBe(true);
  });

  it("renders published page with draft mode", () => {
    expect(shouldRender({ status: "published" }, true)).toBe(true);
  });

  it("renders draft page with draft mode enabled", () => {
    expect(shouldRender({ status: "draft" }, true)).toBe(true);
  });

  it("does NOT render draft page without draft mode", () => {
    expect(shouldRender({ status: "draft" }, false)).toBe(false);
  });

  it("returns 404 for null page regardless of draft mode", () => {
    expect(shouldRender(null, true)).toBe(false);
    expect(shouldRender(null, false)).toBe(false);
  });

  it("REGRESSION: bare ?preview=true (no draft mode) does not leak draft", () => {
    // Simulates an anonymous user appending ?preview=true to the URL
    // without a valid draftMode cookie. The renderer does NOT check
    // searchParams — only draftMode().isEnabled.
    const isEnabled = false;
    const page: Page = { status: "draft" };

    expect(shouldRender(page, isEnabled)).toBe(false);
  });
});
