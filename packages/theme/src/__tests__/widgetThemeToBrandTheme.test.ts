/**
 * widgetThemeToBrandTheme tests — projector from the canonical
 * `WidgetTheme` shape onto the `--brand-*` overlay used by
 * `<ThemeStyleTag overridesOnly>`. Consolidated from the deleted per-app
 * brand projector tests (deposit / shop / trade — all of which had the
 * same byte-identical test suite).
 */

import { describe, it, expect } from "vitest";

import { darkenHex, mixHex, readableTextOn } from "../colorMath";
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

  // D-030 derived tokens — configs carry no explicit fields for these,
  // so the projector derives them from the colors a brand already sets.

  it("derives readable primaryFg: white on a dark primary, near-black on a light one", () => {
    expect(widgetThemeToBrandTheme({ primaryColor: "#121212" }).primaryFg).toBe(
      "#ffffff",
    );
    expect(widgetThemeToBrandTheme({ primaryColor: "#e5ff52" }).primaryFg).toBe(
      "#0e121b",
    );
  });

  it("derives accentFg for both the mirrored and explicit accent", () => {
    const mirrored = widgetThemeToBrandTheme({ primaryColor: "#0b3d91" });
    expect(mirrored.accentFg).toBe(readableTextOn("#0b3d91"));

    const explicit = widgetThemeToBrandTheme({
      primaryColor: "#0b3d91",
      accentColor: "#ffd400",
    });
    expect(explicit.accentFg).toBe("#0e121b");

    const accentOnly = widgetThemeToBrandTheme({ accentColor: "#0ea5e9" });
    expect(accentOnly.accentFg).toBe(readableTextOn("#0ea5e9"));
  });

  it("derives fgSecondary by mixing the foreground toward the page background", () => {
    const overlay = widgetThemeToBrandTheme({
      foregroundColor: "#ffffff",
      pageBackground: "#0a0a0a",
    });
    expect(overlay.fgSecondary).toBe(mixHex("#ffffff", "#0a0a0a", 0.35));
  });

  it("fgSecondary falls back to mixing toward the card background, then white", () => {
    expect(
      widgetThemeToBrandTheme({
        foregroundColor: "#111111",
        background: "#f0f0f0",
      }).fgSecondary,
    ).toBe(mixHex("#111111", "#f0f0f0", 0.35));
    expect(
      widgetThemeToBrandTheme({ foregroundColor: "#111111" }).fgSecondary,
    ).toBe(mixHex("#111111", "#ffffff", 0.35));
  });

  it("does not derive fgSecondary or fg tokens without their source colors", () => {
    const overlay = widgetThemeToBrandTheme({ borderColor: "#dddddd" });
    expect(overlay.fgSecondary).toBeUndefined();
    expect(overlay.primaryFg).toBeUndefined();
    expect(overlay.accentFg).toBeUndefined();
  });

  it("never emits warning — semantic hue, not a brand slot", () => {
    const overlay = widgetThemeToBrandTheme({
      primaryColor: "#ff8800",
      foregroundColor: "#111111",
    });
    expect(overlay.warning).toBeUndefined();
  });
});
