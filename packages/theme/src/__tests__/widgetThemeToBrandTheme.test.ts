/**
 * widgetThemeToBrandTheme tests — projector from the canonical
 * `WidgetTheme` shape onto the `--brand-*` overlay used by
 * `<ThemeStyleTag overridesOnly>`. Consolidated from the deleted per-app
 * brand projector tests (deposit / shop / trade — all of which had the
 * same byte-identical test suite).
 */

import { describe, it, expect } from "vitest";

import { darkenHex } from "../colorMath";
import { widgetThemeToBrandTheme } from "../widget";
import type { WidgetTheme } from "../widget";

describe("widgetThemeToBrandTheme", () => {
  it("returns an empty overlay for an empty theme", () => {
    expect(widgetThemeToBrandTheme({})).toEqual({});
  });

  it("returns an empty overlay when called with no argument", () => {
    expect(widgetThemeToBrandTheme()).toEqual({});
  });

  it("projects primaryColor → primary, derives primaryHover via darkenHex, mirrors to accent", () => {
    const theme: Partial<WidgetTheme> = { primaryColor: "#ff8800" };
    const overlay = widgetThemeToBrandTheme(theme);
    expect(overlay.primary).toBe("#ff8800");
    expect(overlay.primaryHover).toBe(darkenHex("#ff8800", 12));
    expect(overlay.accent).toBe("#ff8800");
  });

  it("uses primaryHoverColor when supplied (no darkenHex fallback)", () => {
    const overlay = widgetThemeToBrandTheme({
      primaryColor: "#ff8800",
      primaryHoverColor: "#cc6600",
    });
    expect(overlay.primaryHover).toBe("#cc6600");
  });

  it("uses accentColor for accent when primaryColor is also set", () => {
    const overlay = widgetThemeToBrandTheme({
      primaryColor: "#ff8800",
      accentColor: "#00aaff",
    });
    expect(overlay.accent).toBe("#00aaff");
  });

  it("projects accentColor alone when no primaryColor", () => {
    const overlay = widgetThemeToBrandTheme({ accentColor: "#00aaff" });
    expect(overlay.accent).toBe("#00aaff");
    expect(overlay.primary).toBeUndefined();
    expect(overlay.primaryHover).toBeUndefined();
  });

  it("projects the full visual token set", () => {
    const overlay = widgetThemeToBrandTheme({
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
