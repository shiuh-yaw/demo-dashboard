import { describe, it, expect } from "vitest";
import { computeAmountDueUsd } from "./compute.js";

describe("computeAmountDueUsd", () => {
  it("basic case: 50 EUR at 1.085 = 54.25 USD", () => {
    expect(computeAmountDueUsd("50", 1.085)).toBe("54.25");
  });

  it("edge case: 11 EUR at 1.085 = 11.94 USD (IEEE 754 half-cent drift)", () => {
    // 11 * 1.085 = 11.935 mathematically. IEEE 754 produces 11.934999…
    // which naive round2() maps to 11.93. Integer-cent path must yield 11.94.
    expect(computeAmountDueUsd("11", 1.085)).toBe("11.94");
  });

  it("zero amount returns 0.00", () => {
    expect(computeAmountDueUsd("0", 1.085)).toBe("0.00");
  });

  it("single-decimal fractional: 1.5 at rate 2 = 3.00", () => {
    expect(computeAmountDueUsd("1.5", 2)).toBe("3.00");
  });

  it("two-decimal fractional: 1.21 at 1.1705 = 1.42 USD", () => {
    // 1.21 * 1.1705 = 1.416305, rounds to 1.42
    expect(computeAmountDueUsd("1.21", 1.1705)).toBe("1.42");
  });
});
