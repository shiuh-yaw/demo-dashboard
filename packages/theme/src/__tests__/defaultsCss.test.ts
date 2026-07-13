/**
 * defaults.css contract test — locks D-007 + D-020.
 *
 * Reads `packages/theme/src/defaults.css` from disk and asserts the
 * full set of `--brand-*` tokens declared inside `:root`. If a token is
 * added or renamed, this test forces an update and a corresponding bump
 * to BRAND_DEFAULTS / themeToCssVars.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULTS_CSS_PATH = resolve(__dirname, "..", "defaults.css");
const css = readFileSync(DEFAULTS_CSS_PATH, "utf8");

function tokensInRootBlock(source: string): string[] {
  const rootMatch = source.match(/:root\s*{([^}]*)}/);
  if (!rootMatch) return [];
  return [
    ...rootMatch[1]!.matchAll(/--([a-z0-9-]+)\s*:/gi),
  ].map((m) => `--${m[1]}`);
}

describe("defaults.css", () => {
  it("declares the canonical --brand-* token set on :root", () => {
    expect(tokensInRootBlock(css).sort()).toMatchInlineSnapshot(`
      [
        "--brand-accent",
        "--brand-accent-fg",
        "--brand-border",
        "--brand-card-gradient-end",
        "--brand-card-gradient-start",
        "--brand-error",
        "--brand-fg",
        "--brand-fg-secondary",
        "--brand-input-border",
        "--brand-muted",
        "--brand-page-bg",
        "--brand-primary",
        "--brand-primary-fg",
        "--brand-primary-hover",
        "--brand-radius",
        "--brand-radius-lg",
        "--brand-radius-sm",
        "--brand-row-bg",
        "--brand-row-divider",
        "--brand-row-hover",
        "--brand-status-completed-bg",
        "--brand-status-completed-fg",
        "--brand-status-failed-bg",
        "--brand-status-failed-border",
        "--brand-status-failed-fg",
        "--brand-status-pending-bg",
        "--brand-status-pending-fg",
        "--brand-strip-bg",
        "--brand-success",
        "--brand-surface",
        "--brand-warning",
      ]
    `);
  });

  it("does not declare any --widget-* tokens (D-007 namespace migration)", () => {
    expect(css).not.toMatch(/--widget-/);
  });

  it("does not declare any proceeds-app-specific tokens", () => {
    expect(css).not.toMatch(/--proceeds-/);
    expect(css).not.toMatch(/--max-width-content/);
  });

  it("preserves the @layer base font smoothing + cursor rules (useful defaults)", () => {
    expect(css).toMatch(/-webkit-font-smoothing:\s*antialiased/);
    expect(css).toMatch(/cursor:\s*pointer/);
    expect(css).toMatch(/cursor:\s*not-allowed/);
  });

  it("refactors component classes to consume --brand-* vars (no hardcoded hex outside :root)", () => {
    // Strip the :root block, then assert no hex values remain in the rest of the file.
    const withoutRoot = css.replace(/:root\s*{[^}]*}/, "");
    // Allow `rgba(0, 0, 0, ...)` shadows in .card; just check for stray `#abc / #abcdef` outside :root.
    const hexMatches = [...withoutRoot.matchAll(/#[0-9a-f]{3,8}\b/gi)];
    expect(hexMatches.map((m) => m[0])).toEqual([]);
  });
});
