/**
 * Lock the EarnTheme → Partial<BrandTheme> projection used by the unified
 * theme injection pattern. Snapshotted because the contract is consumed by
 * <ThemeStyleTag overridesOnly> at SSR time and visual regressions
 * downstream are subtle.
 */
import { describe, expect, it } from "vitest";
import { themeToBrandTheme } from "../lib/earn-brand";

describe("earn themeToBrandTheme", () => {
  it("returns an empty overlay for empty input", () => {
    expect(themeToBrandTheme({})).toEqual({});
    expect(themeToBrandTheme(undefined)).toEqual({});
  });

  it("projects primaryColor + derives primaryHover via darkenHex when hover not set", () => {
    const out = themeToBrandTheme({ primaryColor: "#4779FF" });
    expect(out.primary).toBe("#4779FF");
    // darkenHex("#4779FF", 12) — not asserted exactly here; just non-empty
    expect(out.primaryHover).toMatch(/^#[0-9a-f]{6}$/i);
    // accent falls back to primary when not specified
    expect(out.accent).toBe("#4779FF");
  });

  it("uses explicit primaryHoverColor + accentColor when provided", () => {
    const out = themeToBrandTheme({
      primaryColor: "#4779FF",
      primaryHoverColor: "#3968E8",
      accentColor: "#1967D2",
    });
    expect(out.primaryHover).toBe("#3968E8");
    expect(out.accent).toBe("#1967D2");
  });

  it("projects backgroundColor → pageBackground and backgroundLightColor → surface", () => {
    const out = themeToBrandTheme({
      backgroundColor: "#F9F9F9",
      backgroundLightColor: "#FFFFFF",
    });
    expect(out.pageBackground).toBe("#F9F9F9");
    expect(out.surface).toBe("#FFFFFF");
  });

  it("projects foregroundColor, mutedTextColor, borderColor", () => {
    const out = themeToBrandTheme({
      foregroundColor: "#030303",
      mutedTextColor: "#606060",
      borderColor: "#DADADA",
    });
    expect(out.foreground).toBe("#030303");
    expect(out.muted).toBe("#606060");
    expect(out.border).toBe("#DADADA");
  });

  it("does NOT emit keys for unset fields", () => {
    const out = themeToBrandTheme({ primaryColor: "#4779FF" });
    expect(out).not.toHaveProperty("foreground");
    expect(out).not.toHaveProperty("border");
    expect(out).not.toHaveProperty("muted");
  });
});
