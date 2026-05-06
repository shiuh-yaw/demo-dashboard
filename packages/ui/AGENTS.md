---
name: "@dynamic-demos/ui"
kind: package
flow_role: shared-ui
custody: n/a
status: stable
---

# @dynamic-demos/ui

Shared React component library used by every demo app. Components consume the `--brand-*` CSS variable contract (D-007) and style themselves against whatever theme the app injects via `<ThemeStyleTag>`. Designed to be Dynamic-SDK-friendly so the package can later be open-sourced.

## Capabilities

- Core primitives: `Button`, `Card`, `Input`, `Select`, `Skeleton`, `Spinner`, `Dialog`.
- Widget primitives: `WidgetCard`, `ListRow`, `ScrollableWithFade`, `ErrorCard`, `LoadingCard`.
- Auth + KYC scaffolding: `LoginForm`, `OAuthCompletingCard`, `KycGate`, `WalletSelectionScreen`, `AuthLayout`.
- Branding marks: `DynamicLogo`, `KrakenLogo`, `FireblocksLogomark`, credit-card icons, `PoweredByFooter`.
- Utilities: `Tooltip`, `CopyButton`, `ErrorBanner`, `StableCoinCard`, `ThemeProvider`.

## Public surface

All entries below are stable. Importable from the package root or per-component subpaths declared in `package.json#exports`.

- Primitives — `Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `Input`, `Select`, `Skeleton`, `Spinner`, `Dialog` (+ `DialogContent`, `DialogHeader`, etc.).
- Widget — `WidgetCard` (+ `widgetHeaderTrailingIconButtonClassName`), `ListRow`, `ScrollableWithFade`, `ErrorCard`, `LoadingCard`.
- Auth — `LoginForm`, `OAuthCompletingCard`, `KycGate`, `WalletSelectionScreen`, `AuthLayout`.
- Branding — `DynamicLogo`, `KrakenLogo`, `FireblocksLogomark`, `VisaIcon` / `VisaIconWhite` / `MastercardIcon` / `MastercardIconWhite`, `PoweredByFooter`, `StableCoinCard`.
- Utilities — `Tooltip`, `CopyButton`, `ErrorBanner`, `ThemeProvider`.

Type exports mirror the component name plus `Props` (e.g. `ButtonProps`, `WidgetCardProps`).

## Required environment

None. The package is environment-neutral: it reads no `process.env`.

## Slots vs invariants

**Slots:**

- Brand color, accent, foreground, background, border via `--brand-*` CSS variables (D-007).
- Border radius via `--brand-radius`.
- Logo via `DynamicLogo` / custom `logoUrl` injected by the app's branding context.

**Invariants:**

- Components never read theme values from JS — only via CSS variables.
- No component imports `next/headers`, `next/router`, or any app-specific module.
- No component holds Dynamic / Fireblocks credentials or talks to a provider directly. Auth helpers receive callbacks; they don't dispatch SDK calls themselves.
- React 18+ and React DOM are peer deps; the package never bundles React.

## Integration map

**Imports:** `@dynamic-demos/theme`, `@dynamic-demos/utils`, `@dynamic-labs/iconic`, `@radix-ui/react-dialog`, `lucide-react`, `next-themes`.
**Imported by:** every `apps/*` demo (checkouts, dashboard, deposit, earn, proceeds, remittance, shop, spark26, trade, visa-direct, wallet, cross-border-ap-ar).

## Examples

```tsx
import { Button, WidgetCard, ListRow, Spinner } from "@dynamic-demos/ui";

export function BalancesCard() {
  return (
    <WidgetCard title="Balances">
      <ListRow label="USDC" value="$1,234.56" />
      <ListRow label="ETH" value="$210.00" />
      <Button variant="primary">Refresh</Button>
    </WidgetCard>
  );
}
```

## Do / Don't

- Do: theme via `--brand-*` CSS variables (D-007). The component reads `var(--brand-primary)` etc.
- Do: prefer the Tailwind v4 `bg-(--brand-success)` shorthand for single-variable utilities; reserve `bg-[var(--brand-success,#fallback)]` for comma-fallbacks.
- Do: pass icons as React nodes; never embed bitmap art inside the package.
- Don't: import any SDK or provider package here. UI is presentation-only.
- Don't: read or write cookies / headers from a UI component.
- Don't: hardcode hex colors in component classnames; consume the `--brand-*` contract.

## Open questions / known gaps

- `theme-provider.tsx` re-exports `next-themes`'s provider; once Phase 4 lands the SSR `<ThemeStyleTag>` flow, decide whether `next-themes` stays at all (it manages dark mode, which most demos don't toggle yet).
- No visual regression coverage today. Add Storybook + a smoke screenshot harness when the design system stabilises in Phase 4.
- A few legacy components still hardcode `--widget-*` names; those rename to `--brand-*` during Phase 4 per D-007 / D-020.
