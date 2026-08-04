---
name: "@dynamic-demos/card"
kind: app
flow_role: payouts
custody: non-custodial
status: experimental
---

# @dynamic-demos/card

Stablecoin debit card demo backed by Rain (raincards.xyz). End users sign in
via Dynamic (`@dynamic-labs-sdk/react-hooks`, EVM only), apply for a virtual
card funded by their own RUSDC balance on Base Sepolia, and spend it like a
normal debit card - Rain performs its own KYC, so Dynamic KYC stays "none"
here.

## Public surface

App routes (`/`, `/apply`, `/card`, `/api/card/apply` - all built):

- `/` - login/entry screen (`app/page.tsx`), rendered behind `DynamicGate`
  (`components/dynamic-gate.tsx`). Email OTP + social via the shared
  `LoginForm`, driven directly by `@dynamic-labs-sdk/react-hooks`
  (`useUser`, `useSendEmailOTP`, `useVerifyOTP`,
  `useSignInWithSocialRedirect`, `useCompleteSocialRedirect`). Signed-in
  users redirect to `/apply` unconditionally; `/apply` itself immediately
  forwards to `/card` for users who already have a card, so end behavior is
  correct via one extra hop.
- `/apply` - Rain card KYC application form (`components/application/*`),
  gated on `useUser` (redirect to `/` when signed out) and
  `getRainCardFromUser(user)` (redirect to `/card` when a card already
  exists). Submits via `hooks/use-apply.ts`.
- `/card` - card dashboard, gated the same way as `/apply` (signed-out ->
  `/`, no `rainCard` -> `/apply`). Renders `CardView`
  (`components/dynamic-card/card-view.tsx`), which mirrors `apps/wallet`'s
  UI conventions: a paginated screen-navigation state machine
  (`hooks/use-card-navigation.ts`, `"main" | "deposit" | "activity"`,
  mirroring `apps/wallet/hooks/use-navigation.ts`'s `transitionTo` shape)
  switch-rendered inside a 150ms opacity-transition wrapper (mirroring
  `apps/wallet/components/wallet-app.tsx`). Each screen owns its own
  `WidgetCard` - Main (`screens/main.tsx`: boxed-icon header, card visual,
  `CardBalanceRow` / `AvailableToFundRow` info rows (card number + reveal
  live on the card face), an
  `h-px` divider, then a footer action row of Deposit/Get USDC/Activity),
  Deposit (`screens/deposit.tsx`: `onBack`, `DepositForm` from
  `fund-card.tsx`, EIP-7702 gasless RUSDC transfer to the Rain deposit
  address), and Activity (`screens/activity.tsx`: `onBack`,
  `TransactionsList` from `card-transactions.tsx`). All rows/actions use
  `--brand-*` tokens and wallet's row idiom (boxed icon + label/sublabel
  left, ghost icon actions right) - see
  `apps/wallet/components/wallet/wallet-row.tsx`. All Rain-backed hooks
  only enable their queries once a card exists.
- `/api/card/apply` - the app's one server route. Validates the body with
  `applicationSchema` (zod) and forwards to the dashboard's `/api/rain/apply`
  (server-to-server, `Authorization` + `x-dynamic-environment-id` forwarded
  unchanged), then returns the created card. It does **not** persist anything
  and holds no admin token - storage is the client's job: `use-apply.ts` (and
  `use-reissue-card.ts`) persist the returned card client-side via
  `useRainCardStore().save` (`@dynamic-demos/rain/client`) before routing to
  `/card`.

This app never holds `RAIN_API_KEY` (hard rule 3) - Rain is reached only
through the dashboard's `/api/rain/*` routes, which are the sole readers of
that secret (`apps/dashboard/src/lib/rain/client.ts`).

## Invariants

- All state and auth flow through `@dynamic-labs-sdk/react-hooks` directly
  (`useUser`, `useDynamicClient`, `useSendEmailOTP`, `useVerifyOTP`,
  `useSignInWithSocialRedirect`, `useCompleteSocialRedirect`,
  `useGetWalletAccounts`, `useUpdateUser` via `useRainCardStore`) - no
  app-owned wrapper barrel.
- `components/dynamic-gate.tsx`'s `DynamicGate` blocks all children on
  `useInitStatus()` finishing (`FullScreenSpinner` while pending, `ErrorCard`
  on `"failed"`) - nothing reads `projectSettings`/`user`/wallets before
  init completes. `FullScreenSpinner` is the canonical loading state
  app-wide (a bare centered spinner - `WidgetCard` has no intrinsic width
  and collapses to a thin pill around a lone spinner, so loading states
  never wrap it in one).
- `lib/dynamic-client.ts` holds the SSR-safe client singleton (returns
  `null` on the server; created browser-side only via
  `createDynamicClientSingleton`) that feeds `DynamicProvider` in
  `app/providers.tsx`; `getClient()` is the only way to reach it.
- `RAIN_API_KEY` never enters this app - every Rain read/write goes through
  the dashboard's `/api/rain/*` proxy routes (`lib/dashboard-api.ts`).
  `dashboardGet`/`dashboardPost` are not hooks - they take the Dynamic JWT
  as an explicit `token` argument (from `useDynamicClient().token`) plus an
  optional card ref, sent as `x-rain-card-id` / `x-rain-user-id`.
- Storage/retrieval is app-owned via `useRainCardStore`
  (`@dynamic-demos/rain/client`): the card lives on the Dynamic user record's
  metadata, read (`card`) and written (`save`/`clear`) client-side through the
  Dynamic SDK - no admin token anywhere in this app. Every Rain read hook
  (`use-balance`, `use-transactions`, `use-card-details`, `use-fund-card`)
  pulls `card` from the store and passes `rainCardRef(card)` to the dashboard;
  the dashboard trusts those ids (accepted sandbox IDOR tradeoff - see the
  dashboard AGENTS.md rain note; prod must verify ownership).
- Card-secret crypto (PAN/CVC decrypt) runs client-side only via WebCrypto
  (`lib/rain-crypto/*`, used by `hooks/use-card-details.ts`) - the dashboard
  relays only the opaque RSA-wrapped `sessionId`; the AES key and decrypted
  plaintext never leave the browser or touch a server.
- All onchain funding/faucet transactions (`use-fund-card.ts`, `use-faucet.ts`)
  are EIP-7702 gasless only (project rule) - via Dynamic's native EVM Gas
  Sponsorship (`sendSponsoredTransaction`, `@dynamic-labs-sdk/evm`), which
  auto-signs the 7702 delegation on first send. No ZeroDev, no ERC-4337 /
  smart-account-per-user path. Call batches are built by the pure
  `lib/gasless/build-calls.ts` (`buildTransferCalls`, `buildMintCalls`).
- RUSDC wallet-balance reads (`lib/balances/rusdc-balance.ts`) go straight
  through viem `readContract`/`balanceOf` against Base Sepolia, not
  Dynamic's balance API, because that API does not cover Base Sepolia.
- Base Sepolia only for Phase 1 - RUSDC balance reads, funding, and the
  faucet all hard-code `BASE_SEPOLIA_ID` (`lib/constants.ts`); no other
  network is wired.
- Per-config theming: `app/layout.tsx` fetches the demo config
  (`fetchDemoConfig`, `@dynamic-demos/theme/fetch-demo-config`) and emits
  `--brand-*` overrides via `ThemeStyleTag` (`@dynamic-demos/theme`),
  scoped to `:root` (page scope) or `.brand-scope` (widget scope, selected
  by the `x-card-theme-scope` header `middleware.ts` sets). The default
  render with no config emits no overrides, so the canonical D-030 palette
  from `@dynamic-demos/theme/defaults.css` applies. Each page's outer
  widget wrapper carries the `brand-scope` class so widget-scope overrides
  can target it.
- Sandbox by default (D-005) - `NEXT_PUBLIC_APP_ENV=production` is required
  to opt into production credentials, gated by the `[prod-creds]` PR title
  rule.
- Auto-reissue: `CardView` (`components/dynamic-card/card-view.tsx`) treats a
  "not found" error from `useBalance` (`lib/is-card-not-found.ts`) as a
  stored `rainCard` the current `RAIN_API_KEY` can't resolve (different Rain
  env, purged sandbox card) and silently reissues a fresh per-user card via
  `hooks/use-reissue-card.ts` - same `/api/card/apply` + sandbox KYC path as
  a manual application (`components/application/sandbox-application.ts`'s
  `SANDBOX_APPLICATION`, shared with the form's "Prefill sample data"
  button), then persists the fresh card via `useRainCardStore().save` +
  invalidates the balance/transactions
  queries. Guarded by a `useRef` so it fires at most once per mount; a `$0`
  balance is a success and never triggers it. A `FullScreenSpinner`
  ("Setting up your card...") covers the screen while reissuing; if reissue
  fails, the existing `CardBalanceRow` "Unavailable" state is the fallback -
  it never retries in a loop.
- Branded demo URLs (`?share=` and/or `?theme=` present) get `X-Robots-Tag: noindex, nofollow` via the shared `createConfigForwardingMiddleware` (`applyBrandedNoIndex`/`isBrandedSearch` in `@dynamic-demos/dynamic/noindex`); the bare URL stays indexable.
- `app/opengraph-image.tsx` renders the OG/Twitter unfurl via the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - generic "Stablecoin Card" preview, identical for branded and bare URLs (no prospect/theme data read).

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - per-app Dynamic env (or `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` as the workspace fallback). `resolveCredentials` throws at boot if neither is set.
- `NEXT_PUBLIC_DASHBOARD_URL` - **required.** Dashboard origin; the browser reads Rain through `{this}/api/rain/*` and the app's `/api/card/apply` forwarder posts to `{DASHBOARD_URL ?? NEXT_PUBLIC_DASHBOARD_URL}/api/rain/apply`. (`DASHBOARD_URL` is an optional server-only override for the forwarder.)
- `NEXT_PUBLIC_APP_ENV` - `production` flips sandbox off (D-005); unset = sandbox.
- `NEXT_PUBLIC_TRACK_URL` - dashboard GTM ingest base URL (`@dynamic-demos/analytics`) - optional. Unset → `<GtmTracker>`/`useTrack()` are total no-ops; the app builds and runs unchanged.
- **No `DYNAMIC_API_KEY`.** Card issuance goes through the dashboard's `/api/rain/*` (which holds `RAIN_API_KEY`) and storage is client-side Dynamic metadata (no admin token) - the browser Dynamic client needs only the environment id.

## Analytics taxonomy

Instrumented with `@dynamic-demos/analytics` (second demo after the `apps/wallet` pilot). `<GtmTracker demoSlug="card">` wraps the tree and `<BookACallCta />` renders alongside it in `app/layout.tsx`; both no-op with `NEXT_PUBLIC_TRACK_URL` unset. `GtmTracker` wraps `Providers` so `IdentityBridge` (`components/analytics/identity-bridge.tsx`, mounted once in the layout) can read both `useTrack`/`useIdentify` and `useUser` and fire the auth milestones from any page - the app is multi-page (`/` → `/apply` → `/card`), so unlike wallet's single container there is no one screen mounted across the whole session. The auth milestones read the settled user (`!isPlaceholderData`), since `useUser` can hand back a stale/half-hydrated user while settling (id present, email not yet). `authenticated` is now the shared fleet-wide `useIdentify` primitive (`@dynamic-demos/analytics`, fed the settled user directly - card no longer resolves identity or fire-once-guards it locally); it fires once per page LOAD, NOT deduped across reloads via `sessionStorage`: an already-logged-in user who reloads must still (re)resolve and send the identity, and a `sessionStorage` dedupe would let one stale/early id-only fire permanently suppress the email for the rest of the tab. Pageviews/heartbeats are automatic (package-owned). `CardMilestone` (`lib/analytics/milestones.ts`) is the single-source string-literal union backing every `milestone()` call below - renaming any of these is a breaking analytics change. `signed_in` / `authenticated` / `wallet_funded` deliberately reuse the wallet pilot's names + semantics for cross-demo comparability and shared person-level join keys.

| Milestone | Trigger | Props |
|---|---|---|
| `signed_in` | Settled Dynamic user exists (`IdentityBridge`, `useUser` past `isPlaceholderData`), session-deduped via `useMilestoneOnce`. | none - identity stays share-link-only. |
| `authenticated` | Settled user fed into the shared `useIdentify` (`@dynamic-demos/analytics`, which resolves identity via `resolveUserIdentity` internally). Fires once per page load (the hook's own mount-scoped ref), so a reload re-sends it. | `{ dynamicUserId, email? }` - `dynamicUserId` (the Dynamic user `id`) always; `email` resolved by the shared `resolveUserEmail` (top-level `user.email`, verified-credential fallbacks) so extraction is identical to wallet's. |
| `card_created` | Apply succeeds and the card is saved to Dynamic metadata (`use-apply`, after `store.save`). | none |
| `card_viewed` | Main card screen mount - the provisioned card is on screen (`screens/main.tsx`), session-deduped. | none |
| `card_details_revealed` | PAN/CVC reveal resolves successfully (`use-card-details`); does NOT fire on error. | none |
| `wallet_funded` | First RUSDC funding balance > 0 observed off the existing "Available to fund" read (`wallet-balance-display.tsx`, no new request), session-deduped. | none |
| `deposit_initiated` | Deposit form submitted, before the transfer (`trackedDeposit` in `lib/analytics/flows.ts`). | `{ amount }` |
| `deposit_completed` | Deposit transfer resolves successfully; does NOT fire if the transfer throws. | `{ amount }` |
| `usdc_minted` | Test-USDC faucet mint resolves (`use-faucet` mutation `onSuccess`). | none |

## Scenario page

`app/layout.tsx` (async server) mounts ONE shared scenario shell - `ScenarioLayout` (from `@dynamic-demos/ui`) - around every route, matching wallet's front door: `header` + `hero` on top, the live widget in the left/demo column, the SDK `CodePanel` in the right column, `SiteFooter` below. Because the shell lives in the layout, the hero + code panel persist across the whole flow (`/` login → `/apply` KYC → `/card` view) while only the demo column swaps. The routed pages return **just their widget** (no `<main>` / no `brand-scope` / no width wrapper) - the demo column (`brand-scope mx-auto w-full max-w-md`) provides those. `FullScreenSpinner` / `ErrorCard` render as `<div>` (never `<main>`) so nothing nests inside `ScenarioLayout`'s `<main>`.

- **Hero** (`ScenarioHero`): constant marketing copy (title "A debit card your users fund with stablecoins.", accent "No bank account required.", pitch) - user-facing, no provider name.
- **Code panel** (`CodePanel` + `lib/code-steps.ts`): a static 6-step two-provider story - Dynamic (client) for the embedded wallet + gasless fund, Rain (server) for the card. Steps 2-5 show the REAL Rain issuing endpoints (`POST/GET https://api-dev.raincards.xyz/v1/issuing/...` with the `Api-Key` header) - issue, reveal (encrypted `/secrets`), balance, deposit contract - NOT the app's internal `/api/card/*` proxy routes (deliberately, per the "show the Rain endpoints" ask; the key stays server-side). Shiki-highlighted server-side via `buildCodeSteps`; "Built with" = `@dynamic-labs-sdk` client/react-hooks/evm + a Rain issuing API link (`SdkStack` in the `notice` slot). A context-aware panel (wallet's Q-017) is NOT implemented - one static set.
- **Header**: unbranded → Dynamic `SiteHeader` (Demos / "Stablecoin Card" crumb, chip matches the demo directory); branded (`?theme=`, `isBranded = Object.keys(config).length > 0`) → header dropped, the hero's `logo` slot carries `ScenarioBrandRow` (prospect logo via `ScenarioBrandLogo` island under page scope + a brand-themed `BookACallButton`). Under `?scope=widget` the logo centers over the widget instead. `SiteFooter` renders under every theme (`showCtas` off). There is deliberately **no** floating `BookACallCta` - the header/hero carries the only Book a call. Requires `@import "@dynamic-demos/ui/code-panel.css"` in `globals.css` (already present) for Shiki line numbers.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/theme`,
`@dynamic-demos/types`, `@dynamic-demos/utils`, `@dynamic-demos/rain` (types
only - the client factory that holds `RAIN_API_KEY` lives in
`apps/dashboard`, not here), `@dynamic-demos/rain/client` (`useRainCardStore`
/ `rainCardRef` - the app's card storage/retrieval), `@dynamic-demos/analytics`
(`GtmTracker` / `BookACallCta` / `useTrack` - GTM instrumentation),
`@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/react-hooks`,
`@dynamic-labs-sdk/evm`.

## Open questions / known gaps

- `app/page.tsx`'s own redirect effect still sends every signed-in user to
  `/apply` unconditionally (no direct `rainCard`-exists check there yet);
  `/apply` immediately forwards on to `/card` for users who already have a
  card, so the end behavior is correct today, just via one extra hop.
- The apply form uses plain `useState` (no `react-hook-form`, not installed
  in this app/workspace) and a native `<input type="date">` for birth date
  (no ported `calendar.tsx`) - both are OSS-port simplifications, not gaps.
- `components/credit-cards/index.tsx`'s card face is the single place card
  details render: it shows the masked PAN by default and, when revealed via
  its own eye toggle, the real PAN/CVC with copy icons (reveal state owned by
  `CardView` via `useCardDetails`).
