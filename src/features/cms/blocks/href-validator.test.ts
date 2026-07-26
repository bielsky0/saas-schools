import { describe, expect, it } from "vitest";

import { isAllowedUrl } from "./href-validator";

describe("isAllowedUrl", () => {
  it("allows https:// URLs", () => {
    expect(isAllowedUrl("https://example.com")).toBe(true);
    expect(isAllowedUrl("https://example.com/path?q=1")).toBe(true);
  });

  it("allows http:// URLs", () => {
    expect(isAllowedUrl("http://example.com")).toBe(true);
  });

  it("allows relative paths starting with /", () => {
    expect(isAllowedUrl("/o-nas")).toBe(true);
    expect(isAllowedUrl("/dashboard/settings")).toBe(true);
  });

  it("allows anchor links starting with #", () => {
    expect(isAllowedUrl("#section")).toBe(true);
  });

  it("allows mailto: URIs", () => {
    expect(isAllowedUrl("mailto:hello@example.com")).toBe(true);
  });

  it("allows tel: URIs", () => {
    expect(isAllowedUrl("tel:+48123456789")).toBe(true);
  });

  it("rejects javascript: URI", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URI", () => {
    expect(isAllowedUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects vbscript: URI", () => {
    expect(isAllowedUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllowedUrl("")).toBe(false);
  });

  it("rejects ftp: URI (not in allowlist)", () => {
    expect(isAllowedUrl("ftp://files.example.com")).toBe(false);
  });
});
