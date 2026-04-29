import { describe, it, expect } from "vitest";
import {
  assertSafeConfirmation,
  assertSafeTransactionId,
  sanitizeDisplayString,
} from "./validation.js";

describe("assertSafeConfirmation", () => {
  it.each(["ABC", "banana", "AB12", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"])(
    "accepts well-formed confirmations: %s",
    (v) => {
      expect(() => assertSafeConfirmation(v)).not.toThrow();
    },
  );

  it.each([
    "",
    " ",
    "a".repeat(33),
    "has space",
    "has-dash",
    "has.dot",
    "../etc",
    "foo/bar",
    "<script>",
  ])("rejects malformed: %s", (v) => {
    expect(() => assertSafeConfirmation(v)).toThrow(/invalid confirmation/i);
  });
});

describe("assertSafeTransactionId", () => {
  it("accepts a v4 UUID", () => {
    expect(() =>
      assertSafeTransactionId("3d7c0c7f-76de-4e4a-ae34-36ef123281f3"),
    ).not.toThrow();
  });

  it.each([
    "tx-1",
    "not-a-uuid",
    "../../foo",
    "3d7c0c7f-76de-4e4a-ae34-36ef123281f3/extra",
    "3d7c0c7f76de4e4aae3436ef123281f3",
    "",
  ])("rejects malformed: %s", (v) => {
    expect(() => assertSafeTransactionId(v)).toThrow(/invalid transaction/i);
  });
});

describe("sanitizeDisplayString", () => {
  it("returns undefined for undefined or empty", () => {
    expect(sanitizeDisplayString(undefined)).toBeUndefined();
    expect(sanitizeDisplayString("")).toBeUndefined();
    expect(sanitizeDisplayString("   ")).toBeUndefined();
  });

  it("strips ASCII control characters", () => {
    const nul = String.fromCharCode(0);
    const esc = String.fromCharCode(27);
    const del = String.fromCharCode(127);
    expect(sanitizeDisplayString(`USDC${nul}evil`)).toBe("USDCevil");
    expect(sanitizeDisplayString(`a${esc}b`)).toBe("ab");
    expect(sanitizeDisplayString(`x${del}y`)).toBe("xy");
  });

  it("trims whitespace", () => {
    expect(sanitizeDisplayString("  ethereum  ")).toBe("ethereum");
  });

  it("truncates to the given maxLength", () => {
    expect(sanitizeDisplayString("a".repeat(100), 10)).toBe("a".repeat(10));
  });

  it("passes through clean ASCII unchanged", () => {
    expect(sanitizeDisplayString("USDC")).toBe("USDC");
    expect(sanitizeDisplayString("on Arbitrum")).toBe("on Arbitrum");
  });
});
