import { describe, it, expect } from "vitest";
import { isCardNotFound } from "../is-card-not-found";

describe("isCardNotFound", () => {
  it("is false when there is no error", () => {
    expect(isCardNotFound(false, undefined)).toBe(false);
  });

  it("is false when there is no error, even with a stale not-found message", () => {
    expect(isCardNotFound(false, { message: "Card not found" })).toBe(false);
  });

  it("is false for a transient error unrelated to not-found", () => {
    expect(isCardNotFound(true, { message: "Network timeout" })).toBe(false);
  });

  it("is false when the error has no message", () => {
    expect(isCardNotFound(true, undefined)).toBe(false);
  });

  it("is true for a not-found error message", () => {
    expect(isCardNotFound(true, { message: "Card not found" })).toBe(true);
  });

  it("is true for the dashboard's exact 'No card found' message", () => {
    // getRainCardOr404 (apps/dashboard/src/lib/rain/user.ts) throws exactly
    // "No card found" - regression guard: it has no literal "not found"
    // substring, so a /not found/ regex would miss it.
    expect(isCardNotFound(true, { message: "No card found" })).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isCardNotFound(true, { message: "CARD NOT FOUND" })).toBe(true);
  });

  it("does not treat a $0 balance (no error) as not-found", () => {
    // A $0 balance is a successful fetch: isError is false regardless of
    // amount, so this must never trigger reissue.
    expect(isCardNotFound(false, null)).toBe(false);
  });
});
