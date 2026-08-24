import { describe, expect, it } from "vitest";
import { isTypableAmount, toBaseUnits, toDisplayUnits } from "../lib/amounts";

describe("toBaseUnits", () => {
  it("scales by the asset's decimals", () => {
    expect(toBaseUnits("100", 6)).toBe("100000000");
    expect(toBaseUnits("0.5", 18)).toBe("500000000000000000");
  });

  it("keeps full precision past what a float could hold", () => {
    expect(toBaseUnits("1", 18)).toBe("1000000000000000000");
    expect(toBaseUnits("9007199254740993", 0)).toBe("9007199254740993");
  });

  it("is null for anything that isn't a positive number", () => {
    expect(toBaseUnits("", 6)).toBeNull();
    expect(toBaseUnits("   ", 6)).toBeNull();
    expect(toBaseUnits("0", 6)).toBeNull();
    expect(toBaseUnits("abc", 6)).toBeNull();
    expect(toBaseUnits("-5", 6)).toBeNull();
  });
});

describe("toDisplayUnits", () => {
  it("reverses the scaling", () => {
    expect(toDisplayUnits("100000000", 6)).toBe("100");
    expect(toDisplayUnits("500000000000000000", 18)).toBe("0.5");
  });

  it("returns the raw value when it isn't a number", () => {
    expect(toDisplayUnits("not-a-number", 6)).toBe("not-a-number");
  });
});

describe("isTypableAmount", () => {
  it("allows an empty field and a bare point mid-typing", () => {
    expect(isTypableAmount("", 6)).toBe(true);
    expect(isTypableAmount("1.", 6)).toBe(true);
  });

  it("rejects more decimal places than the asset has", () => {
    expect(isTypableAmount("1.123456", 6)).toBe(true);
    expect(isTypableAmount("1.1234567", 6)).toBe(false);
    expect(isTypableAmount("1.5", 0)).toBe(false);
  });

  it("rejects letters, signs, exponents and a second point", () => {
    expect(isTypableAmount("1e5", 18)).toBe(false);
    expect(isTypableAmount("-1", 18)).toBe(false);
    expect(isTypableAmount("1.2.3", 18)).toBe(false);
  });
});
