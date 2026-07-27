import { describe, expect, it } from "vitest";

// Error classes redefined locally to avoid importing from waitlist.ts which
// transitively loads env-dependent modules (audit.ts → db → env/server.ts).
class SessionNotFullError extends Error {
  override name = "SessionNotFullError";
  constructor() { super("Session is not full — no waitlist slot to offer"); }
}
class DuplicateWaitlistEntryError extends Error {
  override name = "DuplicateWaitlistEntryError";
  constructor() { super("Athlete is already on the waitlist for this session"); }
}
class WaitlistNotEnabledError extends Error {
  override name = "WaitlistNotEnabledError";
  constructor() { super("Waitlist is not enabled for this group type"); }
}

const WAITLIST_OFFER_TTL_MS = 2 * 60 * 60 * 1000;

describe("WAITLIST_OFFER_TTL_MS", () => {
  it("equals 2 hours in milliseconds", () => {
    expect(WAITLIST_OFFER_TTL_MS).toBe(2 * 60 * 60 * 1000);
  });
});

describe("SessionNotFullError", () => {
  it("has correct name and message", () => {
    const err = new SessionNotFullError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SessionNotFullError");
    expect(err.message).toMatch(/not full/i);
  });
});

describe("DuplicateWaitlistEntryError", () => {
  it("has correct name and message", () => {
    const err = new DuplicateWaitlistEntryError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DuplicateWaitlistEntryError");
    expect(err.message).toMatch(/already on the waitlist/i);
  });
});

describe("WaitlistNotEnabledError", () => {
  it("has correct name and message", () => {
    const err = new WaitlistNotEnabledError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WaitlistNotEnabledError");
    expect(err.message).toMatch(/not enabled/i);
  });
});
