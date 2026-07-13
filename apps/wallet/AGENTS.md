---
name: "@dynamic-demos/wallet"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/wallet

Embedded-wallet demo. End users sign in via Dynamic, get a non-custodial wallet, and view balances + sign transactions. Used as the canonical wallet primitive when a partner wants to demo "Dynamic-as-the-wallet" without payments / offramp / bridging on top.

## Capabilities

- Login (Dynamic, email OTP + social providers configured per app config).
- Wallet creation — Dynamic embedded wallet (EVM by default).
- Balance display (multi-chain).
- Transaction signing + JWT-protected API access.
- Scan-to-send — a QR scan icon on the Transactions screen opens an inline scan screen (`scan-qr` navigation screen, rendered in the wallet WidgetCard) that scans a bare recipient address (validated against the wallet's chain) via native `BarcodeDetector` with an `@zxing/browser` fallback, with inline manual-entry fallback, then opens the Send screen with the recipient prefilled. No payment-URI / chain / amount parsing.
- `/jwt` route demonstrates JWT-bound API calls (showcase for sales team).
- Context-aware panel (Q-017) — widget screens drive the scenario page's code panel via `contexts/panel-section-context.tsx` + `components/wallet-panel.tsx`; all panel variants are pre-highlighted server-side in `app/page.tsx`. Sections: the `jwt-generator` screen (opened by the login form's "Sign in with JWT" hand-off button; auth-family screen in `useNavigation`) shows Bring Your Own Auth steps; `dashboard` + `add-wallet` show wallet-management steps (`WALLET_ACCOUNT_STEPS`); `tx-history` shows history/network steps (`WALLET_TX_STEPS`); `send-tx` + `scan-qr` show **chain-specific** send steps (`WALLET_SEND_STEPS_BY_CHAIN`, keyed by `lib/send-chains.ts` — EVM/SOL/SUI/BTC/TON each get their own snippets, mirroring the Dynamic docs' chain-specific sections). Sponsor Network Fees steps exist only for EVM (`sendSponsoredTransaction`) and SOL (`signAndSendSponsoredTransaction`) and link the chain's gas-sponsorship docs page — never ZeroDev docs. Screens declare their section via `usePanelSectionEffect` — top-level screens only; a component nested inside a screen (e.g. `Authorize7702Screen` inside send-tx) must not call it, or its unmount resets the panel under the still-mounted parent. Unmount restores the default panel. `/jwt` stays deep-linkable but is no longer linked from the widget.
- Scenario front door — `/` is a flow-style scenario page inside the shared Dynamic site chrome (`SiteHeader` with a "Wallet" chip linking home to dynamic.dev, `SiteFooter`; both from packages/ui): the live wallet widget sits beside an SDK-only integration panel (`ScenarioHero`/`ScenarioLayout`/`CodePanel`); snippets are Shiki-highlighted server-side (`lib/code-highlight.ts`) from wallet-owned content (`lib/code-steps.ts`). No auth gate — the login card is live on the page. Branded `?theme=` configs surface their logo above the headline via `ScenarioBrandLogo` (null under default chrome — the header brands the page).

## Public surface

App routes:

- `/` — scenario page: Dynamic site chrome + live wallet widget + SDK code panel.
- `/jwt` — demo of JWT-authenticated API.
- `/api/...` — server-only routes for any private state.

This app is one of the **non-consumers** of `@dynamic-demos/dynamic`'s middleware/sync-cookie/`<DynamicInit />` primitives — it consumes the SDK as a client-side singleton without JWT cookie sync. See `packages/dynamic/AGENTS.md` "Open questions" for context.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off (D-005).

No provider keys today — wallet is Dynamic-only.

- `shiki` (pinned 1.24.0, same as flow) — server-side code highlighting for the scenario page.

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020) and rides the canonical Dynamic-default values (D-030 flow palette) with **no local value overrides** — the pre-D-030 charcoal brand was removed when the scenario-page pilot made wallet a Dynamic-default surface; `app/globals.css` keeps only the `--widget-*` compat aliases (which track `--brand-*`). Middleware forwards `?theme=<configId>` as `x-wallet-config-id` and `?scope=<page|widget>` as `x-wallet-theme-scope` (both sticky-cookied; empty param clears on the same request); layout fetches the config and injects overrides via `<ThemeStyleTag overridesOnly>` (D-008) plus `WalletConfigProvider`. **Brand scope:** `page` (default) attaches overrides to `:root` — full immersion; `?scope=widget` confines them to `.brand-scope` (the widget column in `app/page.tsx`) so only the live widget restyles while hero, panel, and site chrome keep the canonical Dynamic look. The brand logo follows the scope (`ScenarioBrandLogo`): above the hero title under `page`, centered above the widget under `widget`. The `--widget-*` compat aliases in `globals.css` are declared on `:root, .brand-scope` — the re-declaration is required because custom properties capture `var()` where they are defined. When a branded config is active, a small "Clear custom theme" text link renders below the widget (`components/reset-theme-button.tsx`) — it navigates to `/?theme=`, which makes the config-forwarding middleware delete the sticky `wallet_config_id` cookie and restores the default chrome. The class-based dark-mode `@variant dark` rule lives in wallet's `globals.css` since the app opts out of Tailwind v4's media-query default; it is not part of the shared theme.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none.

## Slots vs invariants

**Slots:** brand, supported chains (Dynamic env decides), default chain.

**Invariants:**

- Non-custodial — the embedded wallet's keys live with Dynamic; no app-side custody.
- JWT verification on protected API routes uses `verifyDynamicJWT` from `@dynamic-demos/dynamic` (D-003).
- Apps don't access Postgres (D-002). Wallet metadata lives in Dynamic.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state → Dynamic user metadata.
- No canonical transactions — this app doesn't move money through providers.

## Deployment

- **Vercel project:** `dynamic-demos-wallet`.
- **Root dir:** `apps/wallet`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4003.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`.
**Imported by:** none.

## Examples

```ts
// app/api/protected/route.ts
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ wallet: user.wallets?.[0]?.address });
}
```

## Do / Don't

- Do: use `verifyDynamicJWT` for any new protected route. Never hand-roll JWT verification.
- Do: prefer `createDynamicClientSingleton` from `@dynamic-demos/dynamic/client-singleton` — this app fully migrated in Phase 1D.
- Don't: persist user state outside Dynamic metadata.
- Don't: add provider integrations here — keep this demo wallet-pure. Use a new app for payments/offramp/bridges.

## Gotchas

- Panel snippets in `lib/code-steps.ts` teach the **current docs APIs**, preferring `@dynamic-labs-sdk/react-hooks` for reactive reads and auth mutations (`useGetWalletAccounts`, `useGetTokenBalances`, `useGetTransactionHistory`, `useSendEmailOTP`/`useVerifyOTP`, `useSignInWithSocialRedirect`, `useSignInWithExternalJwt`, `useRequestExternalAuthElevatedToken`) and plain client functions where the docs do (sends in handlers, `getNetworksData`). This can be ahead of the app's pinned SDK (0.25.0 predates several of these names) — the planned SDK 1.x upgrade closes that gap. Every TypeScript snippet must open with its import line (test-enforced). The Bring Your Own Auth steps stay deliberately generic. Gasless steps link chain gas-sponsorship docs pages, never ZeroDev docs.

## Open questions / known gaps

- Phase 4-app wallet completed: `globals.css` is now thin, importing `@dynamic-demos/theme/defaults.css` and overriding only the `--brand-*` token values that encode wallet's brand. All component refs use the `--brand-*` namespace (D-007). SSR `<ThemeStyleTag>` is wired via middleware and layout per D-008.
- Multi-chain support includes only extensions with embedded wallet (WaaS) support: EVM, Solana, SUI, Bitcoin, TON. Aptos, Tron, and Starknet extensions are intentionally excluded — they only register injected/external wallet providers and have no WaaS support. The Starknet extension in particular triggers MetaMask's `@consensys/starknet-snap` permission dialog when MetaMask is present. Native token transfers are supported on all registered chains. ERC-20/SPL token transfers are EVM and Solana only. Gas sponsorship is EVM (via ZeroDev) and Solana only.
- No tests in CI today. Add at least smoke coverage for the JWT-protected route in a follow-up.
