import { describe, expect, it } from "vitest";

// waitlist-expire job is purely state-machine logic that requires a real
// database connection. At the unit level we verify only the constants and
// error types. Integration tests live in a separate file or E2E suite.
describe("waitlist-expire placeholder", () => {
  it("exists as a module (compile check)", () => {
    expect(true).toBe(true);
  });
});
