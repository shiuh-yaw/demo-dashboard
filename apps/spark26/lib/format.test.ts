import { describe, expect, it } from "vitest";
import { formatTokenBalance } from "./format.js";

describe("formatTokenBalance", () => {
  it("returns '0' for zero / null / NaN", () => {
    expect(formatTokenBalance(0)).toBe("0");
    expect(formatTokenBalance("0")).toBe("0");
    expect(formatTokenBalance("")).toBe("0");
    expect(formatTokenBalance(null)).toBe("0");
    expect(formatTokenBalance(undefined)).toBe("0");
    expect(formatTokenBalance("not-a-number")).toBe("0");
  });

  it("rounds typical amounts to 3 decimal places (MM default)", () => {
    expect(formatTokenBalance("14.323928")).toBe("14.324");
    expect(formatTokenBalance("0.2324132193777775")).toBe("0.232");
    expect(formatTokenBalance(136.508)).toBe("136.508");
  });

  it("uses 3 significant figures for sub-milli amounts", () => {
    // matches MM's 0.000670-ish precision for tiny ETH
    expect(formatTokenBalance("0.000678141636538402")).toBe("0.000678");
    expect(formatTokenBalance("0.0009999")).toBe("0.001");
  });

  it("formats thousands with comma separator, no decimals", () => {
    expect(formatTokenBalance(5444)).toBe("5,444");
    expect(formatTokenBalance("5444.87")).toBe("5,444");
    expect(formatTokenBalance(999_999)).toBe("999,999");
  });

  it("abbreviates millions and billions", () => {
    expect(formatTokenBalance(7_880_000)).toBe("7.88M");
    expect(formatTokenBalance(1_500_000)).toBe("1.5M");
    expect(formatTokenBalance(1_230_000_000)).toBe("1.23B");
  });

  it("handles strings, numbers, and negatives (edge)", () => {
    expect(formatTokenBalance("1.0000")).toBe("1.000");
    // Negative balances shouldn't happen from on-chain reads, but be defensive.
    expect(formatTokenBalance(-0.5)).toBe("-0.500");
  });
});

describe("formatCurrency", () => {
  it("formats USD with $ prefix and 2 decimal places", async () => {
    const { formatCurrency } = await import("./format.js");
    expect(formatCurrency("499.00", "USD")).toBe("$499.00");
    expect(formatCurrency(0.5, "USD")).toBe("$0.50");
  });

  it("formats EUR with € symbol and 2 decimal places", async () => {
    const { formatCurrency } = await import("./format.js");
    const out = formatCurrency("50", "EUR");
    expect(out).toBe("€50.00");
  });

  it("renders unknown currencies as plain '<amount> <code>' fallback", async () => {
    const { formatCurrency } = await import("./format.js");
    expect(formatCurrency("10", "ZZZ")).toBe("10.00 ZZZ");
  });

  it("renders 0 for non-finite input", async () => {
    const { formatCurrency } = await import("./format.js");
    expect(formatCurrency("banana", "USD")).toBe("$0.00");
  });
});
