import { describe, it, expect } from "vitest";
import { darkenHex, type WidgetTheme } from "@dynamic-demos/theme";
import { themeToBrandTheme } from "../lib/deposit-brand";

describe("themeToBrandTheme", () => {
  it("returns an empty overlay for an empty theme", () => {
    expect(themeToBrandTheme({})).toEqual({});
  });

  it("returns an empty overlay when called with no argument", () => {
    expect(themeToBrandTheme()).toEqual({});
  });

  it("projects primaryColor → primary, derives primaryHover via darkenHex, mirrors to accent", () => {
    const theme: Partial<WidgetTheme> = { primaryColor: "#ff8800" };
    const overlay = themeToBrandTheme(theme);
    expect(overlay.primary).toBe("#ff8800");
    expect(overlay.primaryHover).toBe(darkenHex("#ff8800", 12));
    expect(overlay.accent).toBe("#ff8800");
  });

  it("uses primaryHoverColor when supplied (no darkenHex fallback)", () => {
    const overlay = themeToBrandTheme({
      primaryColor: "#ff8800",
      primaryHoverColor: "#cc6600",
    });
    expect(overlay.primaryHover).toBe("#cc6600");
  });

  it("uses accentColor for accent when primaryColor is also set", () => {
    const overlay = themeToBrandTheme({
      primaryColor: "#ff8800",
      accentColor: "#00aaff",
    });
    expect(overlay.accent).toBe("#00aaff");
  });

  it("projects accentColor alone when no primaryColor", () => {
    const overlay = themeToBrandTheme({ accentColor: "#00aaff" });
    expect(overlay.accent).toBe("#00aaff");
    expect(overlay.primary).toBeUndefined();
    expect(overlay.primaryHover).toBeUndefined();
  });

  it("projects the full visual token set", () => {
    const overlay = themeToBrandTheme({
      pageBackground: "#fafafa",
      background: "#ffffff",
      foregroundColor: "#111111",
      mutedTextColor: "#888888",
      borderColor: "#dddddd",
      rowBackground: "#f4f4f4",
      rowHoverBackground: "#eaeaea",
      gradientFrom: "#abcdef",
      gradientTo: "#fedcba",
    });
    expect(overlay).toMatchObject({
      pageBackground: "#fafafa",
      surface: "#ffffff",
      foreground: "#111111",
      muted: "#888888",
      border: "#dddddd",
      rowBackground: "#f4f4f4",
      rowHover: "#eaeaea",
      cardGradientStart: "#abcdef",
      cardGradientEnd: "#fedcba",
    });
  });
});
