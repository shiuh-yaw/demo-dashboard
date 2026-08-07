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

- Core primitives: `Button`, `Card`, `Input`, `Select`, `SelectMenu`, `Menu`, `Skeleton`, `Spinner`, `Dialog`.
- Widget primitives: `WidgetCard`, `ListRow`, `ScrollableWithFade`, `ErrorCard`, `LoadingCard`.
- Auth + KYC scaffolding: `LoginForm`, `OAuthCompletingCard`, `KycGate`, `WalletSelectionScreen`, `AuthLayout`.
- Scenario-page primitives: `ScenarioHero`, `ScenarioEyebrow`, `RouteChip`/`ChipArrow`, `ScenarioLayout` — flow's scenario-page chrome, generalized (demos-surface phase 2 v2).
- Integration code panel: `CodePanel` (pill tabs, hash deep-links), `Stepper`, `CodeFrame`, `DocsLink`, `renderProse` — content arrives as pre-highlighted HTML (`CodeStep`); the package has no Shiki dependency. `CodeStep.docsUrl` is optional; a step without it renders no "Docs →" link (e.g. steps whose provider has no per-step doc page). `renderProse` lives in its own non-"use client" module (`render-prose.tsx`) so server components can call it during render; do not move it back into the client atoms file.
- Site chrome: `SiteHeader` (logo + "Demos / <app>" breadcrumb, marketing CTAs) and `SiteFooter` ("Made with ♥" + docs/legal links) — the Dynamic marketing header/footer shared by the dashboard landing and demo scenario pages. On demo pages, hovering/focusing the "Demos" crumb opens a CSS-only grid of all demos (the catalog page IS the grid, so its pill stays a plain label) (`DEMO_DIRECTORY` in `demo-directory.ts` - mirrors the dashboard catalog, keep in sync; overridable via the `demos` prop). Deliberately unthemed (hardcoded Dynamic palette; a sanctioned hex exception like the code-frame chrome) and framework-neutral (plain `<a>`, no next/link, no client JS in the components themselves). **In-app (post-auth) merged variant:** `SiteHeader` takes `fullWidth` (drops the max-w-6xl container so the bar aligns with a full-width app), `center` (slot for the app's own nav), and `trailing` (slot for the app's user panel - REPLACES the marketing CTAs; may be a client island). **Own-identity variant:** `logo` (ReactNode replacing the Dynamic lockup - flow passes its Fireblocks Flow wordmark) + `logoHref` (where the logo links, default `homeHref` - flow points it at its internal landing while the Demos crumb keeps the catalog). The displaced CTAs (Book a call / Get a free account) move to `SiteFooter` via `showCtas`; `SiteFooter` also takes `fullWidth`. Earn's `(dashboard)` layout and trade's `AppShell` are the reference consumers: one merged bar, no second app header. Both components carry `dark:` variants (class-gated - active only in apps that set `.dark`, i.e. trade's theme toggle; inert on the dashboard/wallet/earn, which never set the class).
- Branding marks: `DynamicLogo`, `KrakenLogo`, `FireblocksLogomark`, credit-card icons, `PoweredByFooter`.
- Scenario-page state + widgets: `createPanelSectionContext<Section>(default)` - the Q-017 panel-section bridge factory (provider + `usePanelSection` + `usePanelSectionEffect`; no-op outside the provider so screens call unconditionally; wallet/earn/trade instantiate with their own section-id unions in a thin `contexts/panel-section-context.tsx`) - and `ResetThemeButton({ active, variant })` - the "Clear theme" button (full-document navigation to `/?theme=` so the demo middleware deletes the config cookie; apps wrap it with their config-context read). `variant: "block"` (default) is the centered "Clear theme" row below a widget; `"link"` is a bare footer-link-styled button labeled "Clear" for `SiteFooter`'s `extraLinks` slot (flow). `SiteFooter` also takes `extraLinks` - extra entries after Terms/Privacy in the links row. `HeaderMenu` is the shared post-auth header dropdown shell (pill trigger + right-aligned popover; owns open state, outside-click + Escape close) with `HeaderMenuRow` (button or plain `<a>` rows, `default | accent` variants), `BookACallMenuRow` (the canned accent sales CTA), `useHeaderMenu().close()` for custom children, and `headerMenuRowClassName(variant)` for app-side rows that need another element (trade's next/link Settings row). Styling is `--brand-*`-token only - apps that theme dark redefine the tokens under `.dark`, so the shell has no dark-mode classes. Earn's UserMenu and trade's ConnectButton are the reference consumers.
- Wallet-surface primitives: `NetworkSelect` (icon + name chip on `SelectMenu`, so the list is portalled and survives a scrolling toolbar; renders a plain label when there is only one network), `TransactionRow` (a history row), `IconButton` (circular toolbar button matching `CopyButton`'s geometry), `SegmentedTabs` ("All 10 / EVM 4" filter bar). All take derived props and import no SDK - the apps using them pin different `@dynamic-labs-sdk/client` versions, so a shared component naming an SDK type could only ever serve one.
- Utilities: `Tooltip`, `CopyButton`, `ErrorBanner`, `StableCoinCard`, `ThemeProvider`.

## Public surface

All entries below are stable. Importable from the package root or per-component subpaths declared in `package.json#exports`.

- Primitives — `Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `Input`, `Select`, `SelectMenu`, `Skeleton`, `Spinner`, `Dialog` (+ `DialogContent`, `DialogHeader`, etc.).
- Two selects, on purpose. `Select` wraps a native `<select>`: the browser draws the option list with the OS palette, which no CSS can restyle, so on a themed widget surface the closed control matches and the open menu does not. `SelectMenu` draws the list itself (button + `role="listbox"`, `options` array instead of `<option>` children, `onChange(value)` instead of an event) and is themed by the same `--widget-*` variables. Its list renders in a portal at fixed coordinates, because these controls sit in rows inside `overflow-y-auto` lists that would clip an in-flow popup; it flips above the trigger when below would overflow. Reach for `SelectMenu` on widget surfaces, `Select` on plain forms and mobile-first surfaces where the OS picker is the expected control.
- Widget — `WidgetCard` (+ `widgetHeaderTrailingIconButtonClassName`), `ListRow`, `ScrollableWithFade`, `ErrorCard`, `LoadingCard`.
- Auth — `LoginForm` (with `onJwtHelperClick` the JWT section is a single "Sign in with JWT" hand-off button — no paste form; with `jwtHelperHref` it's the accordion paste form with a helper link), `OAuthCompletingCard`, `KycGate`, `WalletSelectionScreen`, `AuthLayout`.
- Scenario — `ScenarioHero`, `ScenarioEyebrow`, `RouteChip`, `ChipArrow`, `ScenarioLayout`, and the branded-hero primitives `ScenarioBrandRow` (logo left / `BookACallButton` right; `variant: "hero"` (default) owns the in-hero row spacing that stands in for the hidden SiteHeader under `?theme=`, `"bar"` is a STICKY brand-token-themed header bar with SiteHeader geometry (h-20, top-0) for apps whose layout owns the header - flow; `logoHref` wraps the logo in a home link) + `ScenarioBrandImage` (aspect-normalized brand `<img>`, `align: start|center|bar` - bar carries no margin, the bar centers it). Apps keep a thin config-reading `scenario-brand-logo.tsx` that delegates rendering here - never re-implement the row or image locally (spacing drift is how the earn/wallet headers diverged).
- Header menu - `HeaderMenu`, `HeaderMenuRow`, `BookACallMenuRow`, `useHeaderMenu`, `headerMenuRowClassName` (+ `HeaderMenuProps`, `HeaderMenuRowProps`).
- Code panel — `CodePanel` renders SDK steps always, plus optional `apiSteps`, `webhooksPane` and `helpersPane` ReactNode tabs (pane-slot tabs compose their own intro notices inside the node), `stepsNotice` (rendered above the SDK/API steps only), `notice` (above every tab), and `hashAliases` (extra URL-hash → tab mappings, e.g. flow's `#exchange` → helpers; after the tab renders the panel scrolls to the element matching the raw hash). Flow is the maximal consumer (all four tabs via a thin app-side adapter); wallet/earn/trade pass steps only. Also `Stepper`, `CodeFrame`, `DocsLink`, `renderProse`, `CodeStep`, `CodePanelProps`, `CodePanelTabId`, `PanelNotice` (+ `PanelNoticeProps`) — flow's gradient callout shell, and `SdkStack` (+ `SdkStackProps`) — "Built with" package list on that shell with an optional docs link, typically passed via `CodePanel`'s `notice` slot. Scenario apps must also `@import "@dynamic-demos/ui/code-panel.css"` in their globals (shiki line numbers + scrollbar styling for the code frame; without it, code blocks render without line numbers).
- Site chrome — `SiteHeader`, `SiteFooter` (+ `SiteHeaderProps`, `SiteFooterProps`).
- Branding — `DynamicLogo`, `KrakenLogo`, `FireblocksLogomark`, `VisaIcon` / `VisaIconWhite` / `MastercardIcon` / `MastercardIconWhite`, `PoweredByFooter`, `StableCoinCard`.
- Utilities — `Tooltip`, `CopyButton`, `ErrorBanner`, `ThemeProvider`.
- Wallet surface — `NetworkSelect` (+ `NetworkOption`), `TransactionRow` (+ `TransactionDirection`, `formatRelativeTime`), `IconButton`, `SegmentedTabs` (+ `SegmentedTabOption`). `NetworkSelect` overrides `SelectMenu`'s `w-full` default with `w-auto`: it is a toolbar chip, and stretching it across the row made the network read as the screen's subject rather than a filter on it. `SelectMenuOption.triggerLabel` renders on the closed control instead of `label`, for lists whose rows carry more than a name (a balance, a count) that belongs in the open list but not on a control sized to a row. `SegmentedTabs` renders whatever it is given - guard on `options.length > 1` at the call site, since a one-segment control is a label wearing a button's clothes. Accounts is the current consumer; wallet has equivalent local versions and has NOT been migrated (deliberate, per the user).
- Overflow menu — `Menu` / `MenuItem` / `MenuSeparator`, for a row's secondary actions so it can carry one clear primary action instead of a line of same-weight icons. Radix `DropdownMenu` underneath (as `Dialog` already is) for focus trapping, typeahead and arrow-key navigation; portalled so a row inside an `overflow-y-auto` list cannot clip it. `MenuItem`'s `danger` is red **at rest**, not only on hover — unlike `Button`'s `danger`, which is a hover state only. Themed from `--widget-*`.

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
- Do: pass pre-highlighted Shiki HTML into `CodeStep.html` (highlight server-side in the app) and include the `.shiki-block` CSS in the app's globals — see apps/wallet or apps/flow.
- Don't: feed user-controlled markup into `CodeStep.html` — CodeFrame injects it unsanitized via `dangerouslySetInnerHTML`; it is for trusted build-time Shiki output only.
- Don't: import any SDK or provider package here. UI is presentation-only.
- Don't: read or write cookies / headers from a UI component.
- Don't: hardcode hex colors in component classnames; consume the `--brand-*` contract.
- Note: two sanctioned hex exceptions — the code-frame dark chrome (`#0d1117`, white-alpha strip; code blocks are deliberately theme-independent) and the `SiteHeader`/`SiteFooter` Dynamic marketing palette (site chrome is deliberately unthemed so the catalog and demos read as one Dynamic site).

## Open questions / known gaps

- `theme-provider.tsx` re-exports `next-themes`'s provider; once Phase 4 lands the SSR `<ThemeStyleTag>` flow, decide whether `next-themes` stays at all (it manages dark mode, which most demos don't toggle yet).
- No visual regression coverage today. Add Storybook + a smoke screenshot harness when the design system stabilises in Phase 4.
- A few legacy components still hardcode `--widget-*` names; those rename to `--brand-*` during Phase 4 per D-007 / D-020.
