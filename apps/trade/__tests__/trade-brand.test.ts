import { describe, expect, it } from "vitest";
import { themeToBrandTheme } from "../lib/trade-brand";

describe("themeToBrandTheme", () => {
  it("returns empty overlay for an empty theme", () => {
    expect(themeToBrandTheme({})).toEqual({});
    expect(themeToBrandTheme()).toEqual({});
  });

  it("projects primaryColor onto primary, primaryHover (darkened), and accent (when accent missing)", () => {
    const overlay = themeToBrandTheme({ primaryColor: "#4779ff" });
    expect(overlay.primary).toBe("#4779ff");
    expect(overlay.accent).toBe("#4779ff");
    expect(overlay.primaryHover).toBeDefined();
    // primaryHover is darkenHex(primary, 12), not equal to primary.
    expect(overlay.primaryHover).not.toBe("#4779ff");
  });

  it("respects explicit primaryHoverColor and accentColor", () => {
    const overlay = themeToBrandTheme({
      primaryColor: "#000",
      primaryHoverColor: "#111",
      accentColor: "#222",
    });
    expect(overlay.primaryHover).toBe("#111");
    expect(overlay.accent).toBe("#222");
  });

  it("projects accentColor alone onto accent (no primary set)", () => {
    expect(themeToBrandTheme({ accentColor: "#abcdef" })).toEqual({
      accent: "#abcdef",
    });
  });

  it("maps surface, foreground, muted, border, page-bg, row tokens, gradients", () => {
    const overlay = themeToBrandTheme({
      pageBackground: "#fafafa",
      background: "#ffffff",
      foregroundColor: "#111",
      mutedTextColor: "#888",
      borderColor: "#eee",
      rowBackground: "#f5f5f5",
      rowHoverBackground: "#eaeaea",
      gradientFrom: "#100",
      gradientTo: "#200",
    });
    expect(overlay).toMatchObject({
      pageBackground: "#fafafa",
      surface: "#ffffff",
      foreground: "#111",
      muted: "#888",
      border: "#eee",
      rowBackground: "#f5f5f5",
      rowHover: "#eaeaea",
      cardGradientStart: "#100",
      cardGradientEnd: "#200",
    });
  });
});
