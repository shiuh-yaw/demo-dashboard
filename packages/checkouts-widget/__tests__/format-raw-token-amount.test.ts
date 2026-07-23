import { describe, it, expect } from "vitest";
import { formatRawTokenAmount } from "../src/lib/format";

// ---------------------------------------------------------------------------
// formatRawTokenAmount - real-behavior tests against src/lib/format.ts.
// The implementation trims trailing zeros but pads back to a minimum of 2
// decimal places, and caps display at 6 decimal places.
// ---------------------------------------------------------------------------

describe("formatRawTokenAmount", () => {
  it("formats 1 BTC (8 decimals) as whole-unit with padded decimals", () => {
    expect(formatRawTokenAmount("100000000", 8)).toBe("1.00");
  });

  it("formats 250 USDC (6 decimals) as whole-unit with padded decimals", () => {
    expect(formatRawTokenAmount("250000000", 6)).toBe("250.00");
  });

  it("truncates a sub-unit amount (1 satoshi, 8 decimals) to the 6-decimal display cap", () => {
    // 1 satoshi = 0.00000001 BTC, but the fractional string is capped at 6
    // chars after left-padding, so precision beyond that is dropped.
    expect(formatRawTokenAmount("1", 8)).toBe("0.000000");
  });

  it("trims trailing zeros but keeps a minimum of 2 decimal places", () => {
    // 0.1 USDC (6 decimals): fractional part "100000" trims to "1", then
    // pads back out to 2 places.
    expect(formatRawTokenAmount("100000", 6)).toBe("0.10");
  });

  it("preserves meaningful fractional digits up to the 6-decimal cap", () => {
    // 0.12345678 (8 decimals): fractional string is "12345678", no trailing
    // zeros to trim, then sliced down to 6 digits.
    expect(formatRawTokenAmount("12345678", 8)).toBe("0.123456");
  });

  it("throws on a non-integer raw amount string", () => {
    expect(() => formatRawTokenAmount("1.5", 8)).toThrow();
  });
});
