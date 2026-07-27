import { describe, expect, it } from "vitest";
import { reservedPrefixOf } from "./reserved-slugs";

describe("reservedPrefixOf", () => {
  /* ─── admin stage change: "apex" → "both" (Payload CMS tenant routing) ─── */

  it("admin is stage 'both' (not 'apex') so it stays on tenant hosts", () => {
    const result = reservedPrefixOf("/admin");
    expect(result).toEqual({ prefix: "admin", stage: "both" });
  });

  it("admin with sub-paths is also stage 'both'", () => {
    const result = reservedPrefixOf("/admin/pages");
    expect(result).toEqual({ prefix: "admin", stage: "both" });
  });

  /* ─── unchanged apex-only routes ───────────────────────────────────────── */

  it("orgs is stage 'apex'", () => {
    const result = reservedPrefixOf("/orgs/new");
    expect(result).toEqual({ prefix: "orgs", stage: "apex" });
  });

  it("settings is stage 'apex'", () => {
    const result = reservedPrefixOf("/settings");
    expect(result).toEqual({ prefix: "settings", stage: "apex" });
  });

  it("blog is stage 'apex'", () => {
    const result = reservedPrefixOf("/blog/some-post");
    expect(result).toEqual({ prefix: "blog", stage: "apex" });
  });

  /* ─── unchanged tenant-only routes ─────────────────────────────────────── */

  it("zapisy is stage 'tenant'", () => {
    const result = reservedPrefixOf("/zapisy/lato");
    expect(result).toEqual({ prefix: "zapisy", stage: "tenant" });
  });

  /* ─── unchanged both routes ────────────────────────────────────────────── */

  it("dashboard is stage 'both'", () => {
    const result = reservedPrefixOf("/dashboard");
    expect(result).toEqual({ prefix: "dashboard", stage: "both" });
  });

  it("login is stage 'both'", () => {
    const result = reservedPrefixOf("/login");
    expect(result).toEqual({ prefix: "login", stage: "both" });
  });

  /* ─── edge cases ───────────────────────────────────────────────────────── */

  it("root path returns null (no prefix)", () => {
    expect(reservedPrefixOf("")).toBeNull();
    expect(reservedPrefixOf("/")).toBeNull();
  });

  it("a slug that starts with a reserved word but is different is not matched", () => {
    expect(reservedPrefixOf("/admin-team")).toBeNull();
    expect(reservedPrefixOf("/zapisy-letnie")).toBeNull();
  });
});
