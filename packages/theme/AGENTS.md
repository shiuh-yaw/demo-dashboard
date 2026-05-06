---
name: "@dynamic-demos/theme"
kind: package
flow_role: theming
custody: n/a
status: stable
---

# @dynamic-demos/theme

Unified theming primitives for demo apps. Owns the `--brand-*` CSS variable contract (D-007), the typed theme objects (`WidgetTheme`, `DashboardTheme`), and the GTM presets. The proceeds-derived defaults land here in Phase 4 (D-020).

## Capabilities

- Typed theme shapes: `BaseTheme`, `WidgetTheme`, `DashboardTheme` (extends `BaseTheme`).
- Typed branding shapes: `BaseBranding`, `WidgetBranding`, `DashboardBranding`.
- CSS-variable serialisers: `widgetThemeToCssVars`, `dashboardThemeToCssVars`.
- Config builders: `createWidgetConfig`, `createDashboardConfig`.
- Border-radius scale: `BORDER_RADIUS_SCALE` (`xs | sm | md | lg`).
- GTM presets — widget: `FINTECH_WIDGET_THEME`, `DARK_WIDGET_THEME`, `MINIMAL_WIDGET_THEME`, `VIBRANT_WIDGET_THEME` (+ `WIDGET_PRESETS`); dashboard: `STREAMING_THEME`, `SOCIAL_THEME`, `FINANCE_THEME`, `PROFESSIONAL_THEME` (+ `DASHBOARD_PRESETS`).

## Public surface

Stable subpaths declared in `package.json#exports`:

- `@dynamic-demos/theme` — index barrel: types + defaults + serialisers + presets.
- `@dynamic-demos/theme/base` — `DEFAULT_BASE_THEME`, `DEFAULT_BASE_BRANDING`, `BORDER_RADIUS_SCALE`, type re-exports.
- `@dynamic-demos/theme/widget` — widget theme + branding + `widgetThemeToCssVars`.
- `@dynamic-demos/theme/dashboard` — dashboard theme + layout + `dashboardThemeToCssVars`.
- `@dynamic-demos/theme/presets` — GTM preset bundles.

Phase 4 will add `@dynamic-demos/theme/defaults.css` (the proceeds-sourced base stylesheet, D-020) and a `<ThemeStyleTag>` server component that renders the `--brand-*` overlay (D-008).

## Required environment

None. The package is data-only.

## Slots vs invariants

**Slots:**

- Per-app brand colors, radii, gradients — anything in `WidgetTheme` / `DashboardTheme`.
- Logo + product image via `BaseBranding` / `WidgetBranding`.
- Whether the "Powered by Dynamic" footer renders via `BaseBranding.showPoweredBy`.

**Invariants:**

- The `--brand-*` namespace is the single CSS variable contract (D-007). Apps must not invent `--app-*` or `--demo-*` variants without a follow-up to D-007.
- Theme objects are pure data; no hooks, no effects, no DOM access.
- The serialisers emit raw CSS strings; injection (via `<ThemeStyleTag>`) is the consumer's responsibility.
- Sandbox-by-default applies to any future theme fetcher (D-005).

## Integration map

**Imports:** `@dynamic-demos/types`, `@dynamic-demos/utils`.
**Imported by:** `@dynamic-demos/ui`, every `apps/*` demo that consumes the design system (proceeds, remittance, trade, earn, wallet, checkouts, shop, deposit, dashboard, visa-direct, spark26, cross-border-ap-ar — varies per app).

## Examples

```ts
import { createWidgetConfig, widgetThemeToCssVars } from "@dynamic-demos/theme/widget";

const config = createWidgetConfig({
  primaryColor: "#FF5A5F",
  accentColor: "#00A699",
  borderRadius: "md",
});

// In a server layout:
const styleString = widgetThemeToCssVars(config.theme);
// <style>{`:root { ${styleString} }`}</style>
```

## Do / Don't

- Do: emit theme values through CSS variables only. Do not pass color hex strings into UI components.
- Do: use `BORDER_RADIUS_SCALE` rather than hand-rolling pixel values.
- Do: place per-demo overrides in dashboard config records and serialise via `*ThemeToCssVars` in the SSR layer (D-008).
- Don't: import this package from a shared component to read live theme values; components consume the CSS variables.
- Don't: introduce new variable namespaces. Add slots to `--brand-*` instead.

## Open questions / known gaps

- `defaults.css` (the proceeds-derived base stylesheet) lands in Phase 4 (D-020). Until then, apps embed their own `globals.css`.
- `<ThemeStyleTag>` server component (the SSR injection helper for the visa-direct cookie pattern) lands in Phase 4 (D-008).
- A handful of presets still encode RGB-string variants for `apps/earn`; those collapse once Phase 4-earn migrates the consumer.
