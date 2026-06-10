/**
 * Unit tests for brand-hydration helpers.
 *
 * These are pure functions — no Redis / service deps.
 */

import { describe, expect, it } from "vitest";

import type { Brand } from "@/lib/services/types";

import { hydrateBrandTheme, brandLogoUrl } from "../brand-hydration";

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "bf_test",
    ownerId: "o1",
    name: "Test Brand",
    description: null,
    companyUrl: null,
    logo: "dynamic",
    logoUrl: null,
    borderRadius: null,
    primaryColor: "#111111",
    primaryHoverColor: "#222222",
    secondaryColor: null,
    accentColor: "#333333",
    pageBackground: null,
    background: null,
    foreground: null,
    mutedTextColor: null,
    borderColor: null,
    rowBackground: null,
    rowHoverBackground: null,
    gradientFrom: null,
    gradientTo: null,
    demoEarnId: null,
    demoCheckoutsId: null,
    demoWalletId: null,
    demoRemittanceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("hydrateBrandTheme", () => {
  it("returns configTheme when brand is null (legacy path)", () => {
    const configTheme = { primaryColor: "#aaa" };
    const result = hydrateBrandTheme(null, configTheme, null);
    expect(result).toBe(configTheme);
  });

  it("returns undefined when brand is null and configTheme is undefined", () => {
    expect(hydrateBrandTheme(null, undefined, null)).toBeUndefined();
  });

  it("overlays core brand colours onto config theme", () => {
    const brand = makeBrand({
      primaryColor: "#ff0000",
      primaryHoverColor: "#cc0000",
      accentColor: "#00ff00",
    });
    const configTheme = { primaryColor: "#old", extra: "kept" };
    const result = hydrateBrandTheme(brand, configTheme, null);
    expect(result).toMatchObject({
      primaryColor: "#ff0000",
      primaryHoverColor: "#cc0000",
      accentColor: "#00ff00",
      extra: "kept",
    });
  });

  it("overlays extended palette when brand has non-null values", () => {
    const brand = makeBrand({
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foreground: "#000000",
      mutedTextColor: "#999999",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
    const configTheme = { primaryColor: "#old" };
    const result = hydrateBrandTheme(brand, configTheme, null);
    expect(result).toMatchObject({
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foregroundColor: "#000000",
      mutedTextColor: "#999999",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
  });

  it("does not override config values when brand extended fields are null", () => {
    const brand = makeBrand(); // all extended fields null
    const configTheme = {
      primaryColor: "#old",
      pageBackground: "#from-config",
      foregroundColor: "#from-config",
    };
    const result = hydrateBrandTheme(brand, configTheme, null);
    expect(result!.pageBackground).toBe("#from-config");
    expect(result!.foregroundColor).toBe("#from-config");
  });

  it("uses foregroundKey option for checkouts (foreground instead of foregroundColor)", () => {
    const brand = makeBrand({ foreground: "#000" });
    const result = hydrateBrandTheme(brand, {}, null, {
      foregroundKey: "foreground",
    });
    expect(result).toHaveProperty("foreground", "#000");
    expect(result).not.toHaveProperty("foregroundColor");
  });

  it("themeOverrides win over brand values", () => {
    const brand = makeBrand({ primaryColor: "#brand" });
    const overrides = { primaryColor: "#override" };
    const result = hydrateBrandTheme(
      brand,
      {} as Record<string, unknown>,
      overrides,
    );
    expect(result!.primaryColor).toBe("#override");
  });
});

describe("brandLogoUrl", () => {
  it("returns undefined when brand is null", () => {
    expect(brandLogoUrl(null)).toBeUndefined();
  });

  it("returns the logoUrl when brand.logo is custom", () => {
    const brand = makeBrand({
      logo: "custom",
      logoUrl: "https://example.com/logo.svg",
    });
    expect(brandLogoUrl(brand)).toBe("https://example.com/logo.svg");
  });

  it("returns undefined when brand.logo is dynamic", () => {
    const brand = makeBrand({ logo: "dynamic", logoUrl: null });
    expect(brandLogoUrl(brand)).toBeUndefined();
  });

  it("returns undefined when logo is custom but logoUrl is null", () => {
    const brand = makeBrand({ logo: "custom", logoUrl: null });
    expect(brandLogoUrl(brand)).toBeUndefined();
  });
});
