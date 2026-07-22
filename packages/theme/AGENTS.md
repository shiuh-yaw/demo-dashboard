---
name: "@dynamic-demos/theme"
kind: package
flow_role: theming
custody: n/a
status: stable
---

# @dynamic-demos/theme

Unified theming primitives for demo apps. Owns the `--brand-*` CSS variable contract (D-007), the canonical `defaults.css` stylesheet (Dynamic-blue flow tone per D-030; originally sourced from proceeds, D-020), the SSR theme overlay (`<ThemeStyleTag>` + `fetchDemoConfig`, D-008), the typed theme objects, and the GTM presets.

## Capabilities

- Canonical stylesheet: `defaults.css` defines every `--brand-*` token plus `@layer base` font/cursor rules and `@layer components` classes (`.heading-page`, `.card`, `.data-table`, `.scrollbar-thin`). Defaults are the canonical Dynamic-blue flow tone per D-030 (`--brand-primary #4779ff`, page bg `#f4f5f7`, radii 6/10/22px); the contract gained `--brand-fg-secondary`, `--brand-primary-fg`, `--brand-accent-fg`, `--brand-warning` with D-030. Six apps (proceeds, cross-border-ap-ar, visa-direct, earn, trade, deposit) pin the previous (pre-D-030) palette locally in their `globals.css`.
- Derived brand tokens: `widgetThemeToBrandTheme` derives `primaryFg`/`accentFg` (readable text on those colors via `readableTextOn`, WCAG-luminance) and `fgSecondary` (`foregroundColor` mixed 35% toward the page/card background) since stored configs carry no explicit fields for them. `--brand-warning` is deliberately never projected — semantic hue, not a brand slot. `widgetThemeToBrandTheme(theme, { deriveCardGradient: true })` derives the card gradient from `secondaryColor` (or darkened primary) when no explicit gradient is set - remittance's projector, folded in; other apps omit the flag and are output-identical.
- Brand contract: `BrandTheme` interface + `BRAND_DEFAULTS` mirror the CSS file in TypeScript.
- CSS-var projector: `themeToCssVars` returns a `Record<string, string>` of `--brand-*` overrides; `cssVarsToRootBlock` serialises to a `:root { ... }` block.
- SSR overlay: `<ThemeStyleTag>` server component renders an inline `<style>` (no `useEffect`, no client mounting); supports `overridesOnly` for surgical token bumps and `selector` to confine the brand to a subtree (default `:root`; wallet passes `.brand-scope` to theme only the live widget).
- Server-side config fetch: `fetchDemoConfig` reads the dashboard API for a stored config and shallow-merges over a fallback. Lenient on failure — returns the fallback so demos keep rendering.
- Demo metadata: `buildDemoMetadata({ demoName, description, appName? })` builds the shared tab title/description shape — branded configs title the tab as the prospect's app (`"SpaceX - Trade"`), unbranded falls back to `"<Demo> - Dynamic Demos"`. Framework-neutral plain object, assignable to Next's `Metadata`. Apps with a brand-name field pair it with a `React.cache`-wrapped config getter shared between `generateMetadata` and the root layout (trade/wallet reference; `fetchDemoConfig` itself is no-store and would double-fetch otherwise).
- Color math: `darkenHex`, `lightenHex`, `mixHex`, `readableTextOn` (HSL/luminance-based, hex-safe).
- Legacy theme shapes: `BaseTheme`, `WidgetTheme`, `DashboardTheme` (extends `BaseTheme`); branding counterparts.
- Per-app serialisers: `widgetThemeToCssVars`, `dashboardThemeToCssVars`.
- Config builders: `createWidgetConfig`, `createDashboardConfig`.
- Border-radius scale: `BORDER_RADIUS_SCALE` (`xs | sm | md | lg`).
- GTM presets — widget: `FINTECH_WIDGET_THEME`, `DARK_WIDGET_THEME`, `MINIMAL_WIDGET_THEME`, `VIBRANT_WIDGET_THEME` (+ `WIDGET_PRESETS`); dashboard: `STREAMING_THEME`, `SOCIAL_THEME`, `FINANCE_THEME`, `PROFESSIONAL_THEME` (+ `DASHBOARD_PRESETS`).

## Public surface

Stable subpaths declared in `package.json#exports`:

- `@dynamic-demos/theme` — index barrel: types + defaults + serialisers + presets + SSR helpers.
- `@dynamic-demos/theme/defaults.css` — canonical stylesheet; import from app `globals.css`.
- `@dynamic-demos/theme/brand` — `BrandTheme` + `BRAND_DEFAULTS`.
- `@dynamic-demos/theme/theme-style-tag` — `<ThemeStyleTag>` server component.
- `@dynamic-demos/theme/fetch-demo-config` — server-side dashboard config loader.
- `@dynamic-demos/theme/color-math` — `darkenHex`, `lightenHex`, `mixHex`.
- `@dynamic-demos/theme/base` — `DEFAULT_BASE_THEME`, `DEFAULT_BASE_BRANDING`, `BORDER_RADIUS_SCALE`, type re-exports.
- `@dynamic-demos/theme/widget` — widget theme + branding + `widgetThemeToCssVars`.
- `@dynamic-demos/theme/dashboard` — dashboard theme + layout + `dashboardThemeToCssVars`.
- `@dynamic-demos/theme/presets` — GTM preset bundles.

## Required environment

`fetchDemoConfig` reads `DASHBOARD_URL` (preferred) or `NEXT_PUBLIC_DASHBOARD_URL` (legacy) when no explicit `dashboardUrl` is passed. When neither is set, the helper logs a warning and returns the caller's fallback.

## Slots vs invariants

**Slots:**

- Per-app brand colors, radii, gradients — anything in `BrandTheme` / `WidgetTheme` / `DashboardTheme`.
- Logo + product image via `BaseBranding` / `WidgetBranding`.
- Whether the "Powered by Dynamic" footer renders via `BaseBranding.showPoweredBy`.

**Invariants:**

- The `--brand-*` namespace is the single CSS variable contract (D-007). Apps must not invent `--app-*` or `--demo-*` variants without a follow-up to D-007.
- `BRAND_DEFAULTS` and `defaults.css` stay in lockstep — adding a token requires updates in both, plus the projection in `themeToCssVars` (the snapshot test in `__tests__/defaultsCss.test.ts` enforces this).
- Theme objects are pure data; no hooks, no effects, no DOM access.
- `<ThemeStyleTag>` is server-only (D-008). No `useEffect`. No client-side CSS injection.
- `fetchDemoConfig` never throws — failure modes return the caller's fallback.
- Sandbox-by-default applies to the dashboard fetcher (D-005).

## Integration map

**Imports:** `@dynamic-demos/types`, `@dynamic-demos/utils`. `<ThemeStyleTag>` requires React 18+ (peer dep).
**Imported by:** `@dynamic-demos/ui`, every `apps/*` demo that consumes the design system (proceeds, remittance, trade, earn, wallet, checkouts, shop, deposit, dashboard, visa-direct, spark26, cross-border-ap-ar — varies per app).

## Examples

App `globals.css`:

```css
@import "tailwindcss";
@import "@dynamic-demos/theme/defaults.css";

@source "../../../packages/ui/src/**/*.tsx";
```

App root layout (SSR theme overlay):

```tsx
import { headers } from "next/headers";
import { fetchDemoConfig, ThemeStyleTag } from "@dynamic-demos/theme";
import { DEFAULT_REMITTANCE_CONFIG } from "@/lib/remittance-config";

export default async function RootLayout({ children }) {
  const id = (await headers()).get("x-remittance-config-id");
  const config = await fetchDemoConfig({
    demoType: "remittance",
    id,
    fallback: DEFAULT_REMITTANCE_CONFIG,
  });
  return (
    <html>
      <head>
        <ThemeStyleTag theme={config.theme ?? {}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Do / Don't

- Do: emit theme values through CSS variables only. Do not pass color hex strings into UI components.
- Do: use `BORDER_RADIUS_SCALE` rather than hand-rolling pixel values.
- Do: place per-demo overrides in dashboard config records and project via `<ThemeStyleTag>` in the SSR layer (D-008).
- Don't: import this package from a shared component to read live theme values; components consume the CSS variables.
- Don't: introduce new variable namespaces. Add slots to `--brand-*` instead.
- Don't: call `<ThemeStyleTag>` from a `"use client"` component — it's a server component by design.

## Open questions / known gaps

- Per-app theme migrations (Phase 4-app sub-phases) ship in follow-up PRs; until then, apps still embed their own `globals.css` and `--widget-*` tokens.
- A handful of legacy presets still encode RGB-string variants for `apps/earn`; those collapse once Phase 4-earn migrates the consumer.
- `widgetThemeToCssVars` and `dashboardThemeToCssVars` still emit `--widget-*` / `--color-earn-*` namespaces; once all per-app migrations land they get retired in favour of `themeToCssVars`.
