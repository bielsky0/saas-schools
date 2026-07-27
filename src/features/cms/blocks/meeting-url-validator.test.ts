import { describe, expect, it } from "vitest";

import { isAllowedMeetingUrl } from "./href-validator";

describe("isAllowedMeetingUrl", () => {
  it("allows https:// URLs", () => {
    expect(isAllowedMeetingUrl("https://meet.google.com/abc-def-ghi")).toBe(true);
    expect(isAllowedMeetingUrl("https://zoom.us/j/123456789")).toBe(true);
    expect(isAllowedMeetingUrl("https://teams.microsoft.com/meeting")).toBe(true);
  });

  it("rejects http:// URLs (insecure)", () => {
    expect(isAllowedMeetingUrl("http://meet.example.com")).toBe(false);
  });

  it("rejects mailto: URIs", () => {
    expect(isAllowedMeetingUrl("mailto:trainer@academy.com")).toBe(false);
  });

  it("rejects tel: URIs", () => {
    expect(isAllowedMeetingUrl("tel:+48123456789")).toBe(false);
  });

  it("rejects relative paths", () => {
    expect(isAllowedMeetingUrl("/meeting")).toBe(false);
  });

  it("rejects anchor links", () => {
    expect(isAllowedMeetingUrl("#section")).toBe(false);
  });

  it("rejects javascript: URI", () => {
    expect(isAllowedMeetingUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllowedMeetingUrl("")).toBe(true);
  });

  it("accepts null", () => {
    expect(isAllowedMeetingUrl(null)).toBe(true);
  });

  it("rejects plain domain without protocol", () => {
    expect(isAllowedMeetingUrl("meet.google.com")).toBe(false);
  });

  it("rejects ftp: URI", () => {
    expect(isAllowedMeetingUrl("ftp://files.example.com")).toBe(false);
  });
});
