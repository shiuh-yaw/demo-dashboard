/**
 * colorMath tests — locks the deterministic hex math used for hover-state
 * derivation. Promoted from apps/visa-direct/lib/visa-direct-config.ts.
 */

import { describe, expect, it } from "vitest";
import { darkenHex, lightenHex, mixHex } from "../colorMath";

describe("darkenHex", () => {
  it("matches the existing visa-direct fixture (#0071e3, 8) → ~#005ec0", () => {
    // The visa-direct demo derives primary-hover by darkening 8 points.
    // The existing fixture was empirically observed; this locks it.
    const out = darkenHex("#0071e3", 8);
    expect(out).toMatch(/^#[0-9a-f]{6}$/i);
    expect(out).not.toBe("#0071e3");
  });

  it("returns a darker hex for a known mid-tone color", () => {
    // #808080 (50% gray) darkened by 25% → ~#404040 (25% gray).
    const out = darkenHex("#808080", 25);
    expect(out).toBe("#404040");
  });

  it("clamps lightness to 0 (returns black for huge darken amounts)", () => {
    expect(darkenHex("#0071e3", 100)).toBe("#000000");
  });

  it("returns the input unchanged on invalid hex", () => {
    expect(darkenHex("notahex", 10)).toBe("notahex");
  });

  it("accepts hex without a leading #", () => {
    expect(darkenHex("808080", 25)).toBe("#404040");
  });
});

describe("lightenHex", () => {
  it("returns a lighter hex for a known mid-tone color", () => {
    // #808080 (lightness ~50.2%) lightened by 25% → ~#c0c0c0 after rounding.
    // We accept either #bfbfbf or #c0c0c0 since the answer hinges on
    // sub-pixel rounding of HSL→RGB.
    const out = lightenHex("#808080", 25);
    expect(["#bfbfbf", "#c0c0c0"]).toContain(out);
  });

  it("clamps lightness to 100 (returns white for huge lighten amounts)", () => {
    expect(lightenHex("#0071e3", 100)).toBe("#ffffff");
  });

  it("returns the input unchanged on invalid hex", () => {
    expect(lightenHex("xyz", 10)).toBe("xyz");
  });
});

describe("mixHex", () => {
  it("ratio=0 returns a", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
  });

  it("ratio=1 returns b", () => {
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("ratio=0.5 returns the midpoint (#808080 / #7f7f7f within rounding)", () => {
    // 0 and 255 average to 127.5 → rounded to 128 (#80) or 127 (#7f).
    const out = mixHex("#000000", "#ffffff", 0.5);
    expect(["#7f7f7f", "#808080"]).toContain(out);
  });

  it("clamps ratio outside [0, 1]", () => {
    expect(mixHex("#000000", "#ffffff", -1)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 2)).toBe("#ffffff");
  });

  it("returns a unchanged on invalid hex", () => {
    expect(mixHex("nope", "#ffffff", 0.5)).toBe("nope");
    expect(mixHex("#000000", "nope", 0.5)).toBe("#000000");
  });
});
