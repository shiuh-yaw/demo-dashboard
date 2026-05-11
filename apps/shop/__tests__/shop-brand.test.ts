import { describe, expect, it } from "vitest";
import { themeToBrandTheme } from "../lib/shop-brand";

describe("shop themeToBrandTheme", () => {
  it("returns an empty overlay for an empty theme", () => {
    expect(themeToBrandTheme({})).toEqual({});
  });

  it("derives primaryHover from primaryColor when not specified", () => {
    const overlay = themeToBrandTheme({ primaryColor: "#335cff" });
    expect(overlay.primary).toBe("#335cff");
    expect(overlay.primaryHover).toBeDefined();
    expect(overlay.primaryHover).not.toBe("#335cff");
    expect(overlay.accent).toBe("#335cff");
  });

  it("uses primaryHoverColor verbatim when supplied", () => {
    const overlay = themeToBrandTheme({
      primaryColor: "#335cff",
      primaryHoverColor: "#1a3ee0",
    });
    expect(overlay.primaryHover).toBe("#1a3ee0");
  });

  it("emits accent only when accentColor is set without primaryColor", () => {
    const overlay = themeToBrandTheme({ accentColor: "#30d158" });
    expect(overlay.primary).toBeUndefined();
    expect(overlay.primaryHover).toBeUndefined();
    expect(overlay.accent).toBe("#30d158");
  });

  it("projects every supported widget theme field onto BrandTheme", () => {
    const overlay = themeToBrandTheme({
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foregroundColor: "#111111",
      mutedTextColor: "#888888",
      borderColor: "#dddddd",
      rowBackground: "#f5f5f5",
      rowHoverBackground: "#eeeeee",
      gradientFrom: "#aaaaaa",
      gradientTo: "#bbbbbb",
    });
    expect(overlay).toEqual({
      pageBackground: "#f0f0f0",
      surface: "#ffffff",
      foreground: "#111111",
      muted: "#888888",
      border: "#dddddd",
      rowBackground: "#f5f5f5",
      rowHover: "#eeeeee",
      cardGradientStart: "#aaaaaa",
      cardGradientEnd: "#bbbbbb",
    });
  });
});
