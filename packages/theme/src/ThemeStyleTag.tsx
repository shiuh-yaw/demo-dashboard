/**
 * <ThemeStyleTag> — SSR theme injection (D-008).
 *
 * Renders an inline <style> block that sets `--brand-*` CSS variables on
 * `:root`, layered on top of the static fallbacks in `defaults.css`. Place
 * inside the root layout's <head> after the `defaults.css` import to
 * achieve zero-FOUC, zero-hydration-mismatch theme overrides.
 *
 * This is a pure server component — no `useEffect`, no client mounting.
 * Per D-008, theme is fetched server-side and projected once.
 *
 * @example
 * ```tsx
 * import { ThemeStyleTag, fetchDemoConfig } from "@dynamic-demos/theme";
 *
 * export default async function RootLayout({ children }) {
 *   const configId = (await headers()).get("x-remittance-config-id");
 *   const config = await fetchDemoConfig({
 *     demoType: "remittance",
 *     id: configId,
 *     fallback: DEFAULT_REMITTANCE_CONFIG,
 *   });
 *   return (
 *     <html>
 *       <head>
 *         <ThemeStyleTag theme={config.theme ?? {}} />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */

import type { BrandTheme } from "./brandTheme";
import { themeToCssVars, cssVarsToRootBlock } from "./themeToCssVars";

export interface ThemeStyleTagProps {
  /** Partial theme overrides; unspecified fields inherit defaults.css. */
  theme?: Partial<BrandTheme>;
  /**
   * If true, only emit overrides explicitly set on `theme`. Defaults to
   * `false` (project the full token set, mirroring defaults.css). Set to
   * `true` when you want to surgically override a single token without
   * re-stating the rest of the contract.
   */
  overridesOnly?: boolean;
  /**
   * CSS selector the variables attach to. Defaults to `:root` (whole
   * page). Pass a class (e.g. `".brand-scope"`) to confine the brand to
   * one subtree — the wallet uses this to theme only the live widget
   * while the surrounding scenario page keeps the canonical chrome.
   */
  selector?: string;
}

export function ThemeStyleTag({
  theme,
  overridesOnly = false,
  selector = ":root",
}: ThemeStyleTagProps): React.JSX.Element {
  const vars = overridesOnly
    ? themeOverridesToVars(theme ?? {})
    : themeToCssVars(theme ?? {});
  const css = cssVarsToRootBlock(vars, selector);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/**
 * Project ONLY the explicitly-set keys onto CSS vars. Used when callers want
 * defaults.css to remain authoritative for unspecified tokens.
 */
function themeOverridesToVars(
  theme: Partial<BrandTheme>,
): Record<string, string> {
  const full = themeToCssVars(theme);
  // Build a record limited to keys whose source value is set on `theme`.
  const cssKeyMap = themeToCssVars({}); // baseline keys → defaults
  const keys = Object.keys(full).filter((k) => full[k] !== cssKeyMap[k]);
  const result: Record<string, string> = {};
  for (const k of keys) {
    result[k] = full[k]!;
  }
  return result;
}
