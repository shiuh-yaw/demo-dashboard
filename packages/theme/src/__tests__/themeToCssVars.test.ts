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
        "--brand-accent": "#4779ff",
        "--brand-accent-fg": "#ffffff",
        "--brand-border": "#e1e4ea",
        "--brand-card-gradient-end": "color-mix(in srgb, var(--brand-primary) 2%, var(--brand-surface))",
        "--brand-card-gradient-start": "color-mix(in srgb, var(--brand-primary) 10%, var(--brand-surface))",
        "--brand-error": "#dc2626",
        "--brand-fg": "#0e121b",
        "--brand-fg-secondary": "#525866",
        "--brand-input-border": "#d2d6de",
        "--brand-muted": "#99a0ae",
        "--brand-page-bg": "#f4f5f7",
        "--brand-primary": "#4779ff",
        "--brand-primary-fg": "#ffffff",
        "--brand-primary-hover": "#2f61e8",
        "--brand-radius": "10px",
        "--brand-radius-lg": "22px",
        "--brand-radius-sm": "6px",
        "--brand-row-bg": "#f9fafb",
        "--brand-row-divider": "#f2f3f5",
        "--brand-row-hover": "#f4f5f7",
        "--brand-status-completed-bg": "#e7f6ec",
        "--brand-status-completed-fg": "#15803d",
        "--brand-status-failed-bg": "#fee2e2",
        "--brand-status-failed-border": "#fecaca",
        "--brand-status-failed-fg": "#b91c1c",
        "--brand-status-pending-bg": "#fef3c7",
        "--brand-status-pending-fg": "#92400e",
        "--brand-strip-bg": "#fafbfc",
        "--brand-success": "#16a34a",
        "--brand-surface": "#ffffff",
        "--brand-warning": "#f59e0b",
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
    // 31 tokens — keep this in sync if the contract grows.
    expect(Object.keys(vars).length).toBe(31);
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
