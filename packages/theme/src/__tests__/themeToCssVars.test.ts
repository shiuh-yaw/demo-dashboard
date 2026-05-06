/**
 * themeToCssVars contract tests.
 *
 * Locks D-007: every `--brand-*` token has a default that mirrors
 * `defaults.css`. Apps may override any subset; unspecified tokens fall
 * back to BRAND_DEFAULTS.
 */

import { describe, expect, it } from "vitest";
import { BRAND_DEFAULTS } from "../brandTheme";
import { cssVarsToRootBlock, themeToCssVars } from "../themeToCssVars";

describe("themeToCssVars", () => {
  it("returns the full --brand-* contract when given an empty theme", () => {
    expect(themeToCssVars({})).toMatchInlineSnapshot(`
      {
        "--brand-accent": "#30d158",
        "--brand-border": "#e8e8ed",
        "--brand-card-gradient-end": "#2c2c2e",
        "--brand-card-gradient-start": "#1d1d1f",
        "--brand-error": "#ff3b30",
        "--brand-fg": "#1d1d1f",
        "--brand-input-border": "#d2d2d7",
        "--brand-muted": "#86868b",
        "--brand-page-bg": "#f5f5f7",
        "--brand-primary": "#0071e3",
        "--brand-primary-hover": "#0077ed",
        "--brand-radius": "12px",
        "--brand-radius-lg": "24px",
        "--brand-radius-sm": "8px",
        "--brand-row-bg": "#f5f5f7",
        "--brand-row-divider": "#f0f0f5",
        "--brand-row-hover": "#eeeeef",
        "--brand-status-completed-bg": "#e8f8ee",
        "--brand-status-completed-fg": "#1b7f3b",
        "--brand-status-failed-bg": "#fdecee",
        "--brand-status-failed-border": "#ffcdd2",
        "--brand-status-failed-fg": "#c62828",
        "--brand-status-pending-bg": "#fff3cc",
        "--brand-status-pending-fg": "#92600a",
        "--brand-strip-bg": "#fafafc",
        "--brand-success": "#1b7f3b",
        "--brand-surface": "#ffffff",
      }
    `);
  });

  it("returns the same record when called with no argument", () => {
    expect(themeToCssVars()).toEqual(themeToCssVars({}));
  });

  it("overrides only the specified tokens, leaving the rest as defaults", () => {
    const out = themeToCssVars({
      primary: "#ff00aa",
      radius: "20px",
    });
    expect(out["--brand-primary"]).toBe("#ff00aa");
    expect(out["--brand-radius"]).toBe("20px");
    // Everything else should match defaults.
    expect(out["--brand-accent"]).toBe(BRAND_DEFAULTS.accent);
    expect(out["--brand-fg"]).toBe(BRAND_DEFAULTS.foreground);
    expect(out["--brand-border"]).toBe(BRAND_DEFAULTS.border);
  });

  it("projects every BrandTheme key, including the long tail of status tokens", () => {
    const out = themeToCssVars({
      statusFailedBorder: "#deadbe",
      stripBackground: "#abcabc",
      cardGradientStart: "#000000",
    });
    expect(out["--brand-status-failed-border"]).toBe("#deadbe");
    expect(out["--brand-strip-bg"]).toBe("#abcabc");
    expect(out["--brand-card-gradient-start"]).toBe("#000000");
  });

  it("BRAND_DEFAULTS is exhaustive — every key feeds a CSS var", () => {
    const vars = themeToCssVars({});
    // 27 tokens — keep this in sync if the contract grows.
    expect(Object.keys(vars).length).toBe(27);
    for (const value of Object.values(vars)) {
      expect(value).toBeTruthy();
    }
  });
});

describe("cssVarsToRootBlock", () => {
  it("renders a parseable :root { ... } block", () => {
    const css = cssVarsToRootBlock({
      "--brand-primary": "#ff00aa",
      "--brand-radius": "20px",
    });
    expect(css).toBe(":root {\n  --brand-primary: #ff00aa;\n  --brand-radius: 20px;\n}");
  });

  it("handles empty input as an empty :root block", () => {
    expect(cssVarsToRootBlock({})).toBe(":root {\n\n}");
  });
});
