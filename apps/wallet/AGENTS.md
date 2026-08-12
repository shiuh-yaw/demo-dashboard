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
- Context-aware panel (Q-017) — widget screens drive the scenario page's code panel via `contexts/panel-section-context.tsx` + `components/wallet-panel.tsx`; all panel variants are pre-highlighted server-side in `app/page.tsx`. Sections: the `jwt-generator` screen (opened by the login form's "Sign in with JWT" hand-off button; auth-family screen in `useNavigation`) shows Bring Your Own Auth steps; `dashboard` + `add-wallet` show wallet-management steps (`WALLET_ACCOUNT_STEPS`); `tx-history` shows history/network steps (`WALLET_TX_STEPS`); `settings` (cog in the dashboard header's trailing slot) shows key-share backup + export steps (`WALLET_SETTINGS_STEPS`); the live screen runs the same docs flow the panel teaches - `getGoogleDriveBackupReadiness` pre-flight + `isInsufficientGoogleDriveScopesError` recovery around `backupWaasKeySharesToGoogleDrive` - and requires the dashboard's Google Drive backup toggle + Drive API enabled in the Google Cloud project. The screen also offers per-wallet offline export: `exportWaasClientKeyshares` file download (in the SDK but undocumented, so the panel teaches only the documented `exportWaasPrivateKey` secure-iframe reveal); `send-tx` + `scan-qr` show **chain-specific** send steps (`WALLET_SEND_STEPS_BY_CHAIN`, keyed by `lib/send-chains.ts` — EVM/SOL/SUI/BTC/TON each get their own snippets, mirroring the Dynamic docs' chain-specific sections). Sponsor Network Fees steps exist only for EVM (`sendSponsoredTransaction`) and SOL (`signAndSendSponsoredTransaction`) and link the chain's gas-sponsorship docs page — never ZeroDev docs. Screens declare their section via `usePanelSectionEffect` — top-level screens only; a component nested inside a screen (e.g. `Authorize7702Screen` inside send-tx) must not call it, or its unmount resets the panel under the still-mounted parent. Unmount restores the default panel. `/jwt` stays deep-linkable but is no longer linked from the widget.
- Scenario front door — `/` is a flow-style scenario page inside the shared Dynamic site chrome (`SiteHeader` with a "Wallet" chip linking home to dynamic.dev, `SiteFooter`; both from packages/ui): the live wallet widget sits beside an SDK-only integration panel (`ScenarioHero`/`ScenarioLayout`/`CodePanel`); snippets are Shiki-highlighted server-side (shared `@dynamic-demos/code-highlight`) from wallet-owned content (`lib/code-steps.ts`). No auth gate — the login card is live on the page. Branded `?theme=` configs surface their logo above the headline via `ScenarioBrandLogo` (null under default chrome — the header brands the page).

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
- `ALCHEMY_API_KEY` — server-only, optional. Backs `/api/balances` for Base Sepolia token balances (Dynamic's balances API doesn't cover 84532); without it the route 503s and the asset picker just omits Base Sepolia ERC-20s.
- `NEXT_PUBLIC_TRACK_URL` - dashboard GTM ingest base URL (`@dynamic-demos/analytics`, Phase 09) - optional. Unset → `<GtmTracker>`/`useTrack()`/`<BookACallCta>` are total no-ops; the app builds and runs unchanged.

- `shiki` (pinned 1.24.0, same as flow) — server-side code highlighting for the scenario page.

## Analytics taxonomy

GTM Phase 09 pilot - `apps/wallet` is the first demo instrumented with `@dynamic-demos/analytics`. `<GtmTracker demoSlug="wallet">` wraps the tree in `app/layout.tsx`; no-op with `NEXT_PUBLIC_TRACK_URL` unset. The floating `<BookACallCta>` is deliberately NOT mounted - the Book a call already lives in the header/hero (`SiteHeader` marketing nav unbranded, `ScenarioBrandRow`'s `BookACallButton` branded), so a floating pill would double it. Pageviews/heartbeats are automatic (package-owned). `WalletMilestone` (`lib/analytics/milestones.ts`) is the single-source string-literal union backing every `milestone()` call below - renaming any of these is a breaking analytics change.

| Milestone | Trigger | Props |
|---|---|---|
| `signed_in` | Dynamic auth success (`isLoggedIn` flips true), session-deduped via `useMilestoneOnce`. | none - no email; identity stays share-link-only. |
| `authenticated` | Any auth method succeeds and the Dynamic user populates (`<IdentityBridge />`, `components/analytics/identity-bridge.tsx`, mounted once in `app/layout.tsx` inside `<GtmTracker>`; reads `useAuthenticatedIdentity`, then feeds the shared `useIdentify` primitive - covers email OTP, social/Google). Gated on `isClientReady` so the fully-restored user (with email) is read before firing. Fires once per page load (the shared hook's mount-scoped ref), NOT deduped across reloads via `sessionStorage` - an already-logged-in reload must still re-send the identity, and a dedupe would let one stale/early id-only fire suppress the email for the rest of the tab. Person-level join keys for enrichment. This is the fleet-wide primitive extracted (from this app's own pilot) into `@dynamic-demos/analytics` - every other demo app that mounts `GtmTracker` now emits it the same way via its own `IdentityBridge`. | `{ dynamicUserId, email? }` - `dynamicUserId` always; `email` resolved by the shared `resolveUserEmail` (`@dynamic-demos/analytics`; top-level `user.email` + verified-credential fallbacks) so extraction is identical across demos. |
| `wallet_funded` | First balance > 0 observed in the send screen's existing token-balance fetch (no new request added for this), session-deduped. | none |
| `send_initiated` | Send form submitted, before the transaction is sent (`trackedSend` in `lib/analytics/flows.ts`). | `{ asset, amount }` - `asset` is a symbol (`custom_token` for manual token entry), never a contract address. |
| `send_completed` | Transaction send resolves successfully; does NOT fire if `sendFn` throws. | `{ asset, amount }` |
| `backup_completed` | Google Drive key-share backup resolves successfully (`trackedBackup`); does NOT fire on failure. | none |
| `receive_viewed` | Wallet-list (`DashboardScreen`) mount. This app has no dedicated receive/QR screen - the wallet list, where addresses are shown with a copy button to receive funds, stands in for it. | none |
| `message_signed` | A message signs successfully on the sign-message screen (`components/screens/sign-message-screen.tsx`); does NOT fire on failure. Session-deduped via `useMilestoneOnce`. | none |

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
- Branded demo URLs (`?share=` and/or `?theme=` present) get `X-Robots-Tag: noindex, nofollow` via the shared `createConfigForwardingMiddleware` (`applyBrandedNoIndex`/`isBrandedSearch` in `@dynamic-demos/dynamic/noindex`); the bare URL stays indexable.
- `app/opengraph-image.tsx` renders the OG/Twitter unfurl via the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - generic "Wallet" preview, identical for branded and bare URLs (no prospect/theme data read).

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

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/analytics` (Phase 09).
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

- Base Sepolia (chainId 84532) balances: Dynamic's balances API doesn't cover it, so `getTokenBalances` (`lib/dynamic/balance.ts`) merges ERC-20 balances from `/api/balances` (Alchemy, server-only key) for that network only; every other network is pure SDK. Tokens surfaced there are the allowlist in `lib/base-sepolia-tokens.ts` (USDC today). This is an app-specific workaround, so it stays out of the code panel (which teaches docs APIs). Mirrors flow's `/api/kyc-deposit/balances` precedent.

- Panel snippets in `lib/code-steps.ts` teach the **current docs APIs**, preferring `@dynamic-labs-sdk/react-hooks` for reactive reads and auth mutations (`useGetWalletAccounts`, `useGetTokenBalances`, `useGetTransactionHistory`, `useSendEmailOTP`/`useVerifyOTP`, `useSignInWithSocialRedirect`, `useSignInWithExternalJwt`, `useRequestExternalAuthElevatedToken`) and plain client functions where the docs do (sends in handlers, `getNetworksData`). The app direct-pins `@dynamic-labs-sdk` 1.19.1 (exact, bypassing the workspace catalog's 0.25.0 - required for correct offline key-share export after Drive-backup reshares), so client functions and react-hooks names in snippets exist at the installed version. The app itself now runs react-hooks: `app/providers.tsx` mounts `DynamicProvider` client-side only (the client singleton is null during SSR; every hooks consumer renders behind the `isClientReady` gate), `useWalletAccounts` and `useActiveNetwork` are thin adapters over `useGetWalletAccounts` / `useGetActiveNetworkData`. `useNetworks` stays on the plain `getNetworksData` (static config - no react-hook equivalent, no subscription needed); balances/history hooks are the remaining `useSdkQuery` migration candidates. Every TypeScript snippet must open with its import line (test-enforced). The Bring Your Own Auth steps stay deliberately generic. Gasless steps link chain gas-sponsorship docs pages, never ZeroDev docs.

- Action-MFA step-up: `send-tx`, `sign-message`, and `authorize-7702` mint a single-use TOTP token (`authenticateTotpMfaDevice({ createMfaTokenOptions: { singleUse: true } })`) right before the WaaS operation, and fall back to `SetupMfaScreen` / `onNeedsMfaSetup` on `isMfaRequiredError`. Whether a code is prompted is per-action, not any-MFA-enabled: `useSignMfaRequired()` calls `isMfaRequiredForAction({ mfaAction: MFAAction.WalletWaasSign })` - the same action the SDK's WaaS sign path gates on internally (`consumeMfaTokenIfRequiredForAction`). So message signing, tx signing, and 7702 auth all require a code only when the **Wallet Sign** protected action is on; enabling an unrelated action like **Wallet Export** must NOT force a code on these. The proactive setup Shield in `wallet-row` is separate: it keys off `useMfaStatus().isRequired` (enrollment required), not the per-action check. The MFA input only shows once a device exists; the no-device case is caught from the throw. Message signing is a `WalletWaasSign` action, so the same gate covers it. `useSignStepUp()` composes the gate once and every surface reads it (`required` / `needsEnrollment` / `requiresCode`): sign-message, send-tx, authorize-7702, and the dashboard wallet row. Invariant: **required + nothing enrolled = enrollment is the only offer** - the row shows the Shield alone (send/sign/scan hidden, since they'd dead-end) and the flow screens render `SetupMfaScreen` rather than a code field nobody can answer. Three-state model, read from the environment: (a) 2FA **live** in the environment - `mfa.enabled || actions.some(required)` (`isMfaEnabled`). Neither one on and `registerTotpMfaDevice` throws "MFA is not enabled for this environment" no matter how `methods` is configured, so **enrolling needs both** that and the method itself enabled: `canEnrollMfa = isMfaEnabled && methods[totp].enabled` (`ENROLLABLE_MFA_METHODS`). Read the factors from `methods[]`, never `availableMethods` - that's the platform catalog and still lists a method whose `methods[].enabled` is false. Enrollment policy comes from the current `enrollment` field ("none" | forced) with the legacy `required` flag OR'd in; (b) **required** for signing - the `WalletWaasSign` protected action or session-based MFA (`actionRequired || sessionMfaEnabled`); (c) enabled-but-not-required, which behaves exactly like disabled (no step-up). A demo-only toggle in the Settings screen (`contexts/demo-mfa-context.tsx`, localStorage `wallet-demo-require-sign-mfa`) flips (c) into (b) locally: `required = actionRequired || sessionMfaEnabled || (requireSignMfa && canEnrollMfa)`. It feeds `useSignStepUp`, so it covers everything the **Wallet Sign** action covers - message signing, sends, and 7702 auth - not message signing alone. The resulting flow is the SAME real flow a required environment gets - real `registerTotpMfaDevice` enrollment when `!hasDevice`, real TOTP code, real single-use token. Nothing is simulated. The toggle needs 2FA enabled in the environment (nothing to enroll otherwise), so the switch is disabled with a note when `!isMfaEnabled`.

- MFA onboarding outranks every step-up gate. While onboarding is incomplete the backend withholds `user:basic` and **every** WaaS call - sign, send, export, backup - throws `WaasOnboardingIncompleteError` ("Cannot create or access the embedded wallet until onboarding is complete") before any MFA-token logic runs. A code can't help; finishing onboarding can. `isUserOnboardingComplete()` is four independent conditions - missing KYC fields, `isUserMissingMfaAuth()` (`user.scope` contains `requiresAdditionalAuth`), `isPendingRecoveryCodesAcknowledgment()`, and device registration - so never infer which one fired from the error text; they share one message. `isMfaOnboardingPending()` (`lib/dynamic/mfa.ts`, surfaced as `useMfaStatus().onboardingPending`) covers the two MFA-owned branches only, since the Shield routes to MFA setup and could not resolve KYC or device registration. Both step-up hooks OR it into `needsEnrollment` and subtract it from `requiresCode`, so the Shield-only invariant covers it - including the Settings rows, where backup and share download would otherwise dead-end.

- **Recovery codes are an onboarding step, not a bonus screen.** When the enrolled method has `allowBackupCodes` (TOTP does by default), a successful `authenticateTotpMfaDevice` leaves `mfaBackupCodeAcknowledgement: Pending`, and onboarding stays incomplete until `acknowledgeRecoveryCodes()` runs. Skip it and the user ends up with a verified authenticator and a wallet that throws on every operation - the failure surfaces later, on an unrelated screen, which makes it easy to misdiagnose as a step-up bug. `SetupMfaScreen` therefore has a `recovery-codes` step it enters after verifying, and also on mount when `isRecoveryCodesPending()` - that second path matters because the user already has a device, so the old "you already have an authenticator" branch would dead-end exactly the people who are stuck.

- Export step-up (`useExportStepUp()`, Settings screen): private-key reveal runs the SDK's `exportPrivateKey`, which consumes a token whenever the **Wallet Export** action is protected - without one it throws "No MFA token found". The gate is `isMfaRequiredForAction({ mfaAction: MFAAction.WalletWaasExport })` and nothing else: no demo toggle (that one is signing-scoped) and no session-MFA fallback, since the SDK consults only this action and anything OR'd in would prompt for a token nothing consumes. Same invariant as signing - no device means the key button becomes a Shield into `SetupMfaScreen`; with a device, an inline `MfaCodeInput` mints the single-use token first. The other two Settings actions are NOT gated because the SDK doesn't gate them: `exportClientKeyshares` (share download) consumes no token at all, and `backupKeySharesToGoogleDrive` never calls `consumeMfaTokenIfRequiredForAction` - if the backend starts enforcing `wallet.waas.reshare`, the SDK has no parameter to carry a token, so that's an upstream gap, not an app fix. `refreshWalletAccountShares` is the one remaining ungated consumer (`WalletWaasRefresh`), unused here today.

- **Passkeys are not MFA devices.** Dynamic has no passkey MFA-device registry: `authenticatePasskeyMFA()` authenticates against the user's ordinary **sign-in passkeys**, and `registerPasskey()` is the enrollment. So `getMfaDevices()` never returns a passkey and `getPasskeys()` is the only source for "has a passkey". `useMfaStatus().hasDevice` ORs both - miss that and a passkey-only user reads as unenrolled, gets the Shield, and loops through enrollment forever. `hasTotp` / `hasPasskey` are exposed separately for pickers.

- One step-up entry point: `mintMfaToken({ method, code? })` (`lib/dynamic/mfa.ts`). Every protected operation calls it - `sign-message.ts`, the five `send-*-transaction.ts` senders, `sign-7702-authorization.ts`, and the Settings key reveal - and it is the only place that knows the factors differ: the SDK spells the token option `createMfaTokenOptions` for TOTP and `createMfaToken` for passkey, and only TOTP takes a code. Both are flagged deprecated in favour of `requestedScopes`, which is NOT a substitute - it returns an elevated access token and the WaaS path consumes an MFA token. Adding a factor means editing `mintMfaToken`, not the call sites.

- `StepUpGate` (`useSignStepUp` / `useExportStepUp`) returns `requiresStepUp` plus `stepUpMethod`, not a boolean "needs a code": passkey step-up has nothing to type, so a screen renders `MfaCodeInput` only for `stepUpMethod === "totp"` and otherwise just notes that the passkey prompt will appear on submit. **Passkey always wins** when one is enrolled and WebAuthn is available - a tap beats six digits. Nothing in Dynamic arbitrates this: there is no default-factor concept spanning both registries, and the backend consumes whichever token it's handed. Because `hasPasskey` is a *server-side* fact that says nothing about the device in front of you, every passkey prompt also exposes `canUseTotpInstead` / `switchToTotp` - someone who enrolled on a laptop and opened the demo on a phone would otherwise face a prompt that cannot succeed. The Settings key reveal has no pre-prompt UI to hang that on, so it falls back automatically when the passkey attempt throws. Don't rename `switchToTotp` to `use*`: `rules-of-hooks` treats it as a hook and errors. `SetupMfaScreen` shows a factor picker when passkeys are enabled AND `isPasskeySupported()` (WebAuthn missing means TOTP is the only route); its mount effect waits on `useMfaStatus().isLoading`, because reading `passkeyEnabled` while settings are still loading silently skips the picker.

- Removing a factor is itself step-up protected: `deletePasskey` and `deleteMfaDevice` both need an elevated token scoped `credential:unlink`, and `deleteMfaDevice` takes the MFA token as an argument (the WaaS path reads it off client state instead) - which is why `mintMfaToken` returns the token string. `deleteMfaFactor` in `lib/dynamic/mfa.ts` wraps both. The Settings factor list blocks deleting the **last** factor while enrollment is required: the wallet would lock, and the delete needs a step-up the user could no longer perform. Passkeys are labelled with a coarse browser name from `userAgent` - two registered the same day are otherwise identical, which is no basis for choosing which to remove.

- Adding a third factor: `ENROLLABLE_MFA_METHODS` (`lib/dynamic/mfa.ts`) is the single enrollment gate - every "can we enroll?" check reads it. A new factor needs an entry there, a branch in `mintMfaToken`, a case in `SetupMfaScreen`'s picker, and a `hasDevice` contribution in `useMfaStatus` if the SDK keeps it in its own list (as it does for passkeys). Nothing else should learn the factor's name.

## Open questions / known gaps

- Phase 4-app wallet completed: `globals.css` is now thin, importing `@dynamic-demos/theme/defaults.css` and overriding only the `--brand-*` token values that encode wallet's brand. All component refs use the `--brand-*` namespace (D-007). SSR `<ThemeStyleTag>` is wired via middleware and layout per D-008.
- `WAAS_CHAINS` (`lib/dynamic/client.ts`) is the served-chain list, and `useChainOptions` intersects the environment's networks with it. Needed because `getNetworksData()` reads `projectSettings.networks` and is **not** filtered by registered extensions - enable a chain in the dashboard that no extension serves and Add Wallet grows a row that dead-ends on click. Before adding a chain, check its package actually ships WaaS: `@dynamic-labs-sdk/ton` has an `addWaasTonExtension` and a `waas` entry point, whereas `stellar` (only `addStellarExtension` + injected) and `aleo` (only `addAleoWalletStandardExtension`) contain no WaaS code at all - they're external-wallet only, like Aptos/Tron/Starknet. Tempo and Midnight have no `@dynamic-labs-sdk` package at all.

- Multi-chain support includes every extension with embedded wallet (WaaS) support: EVM, Solana, SUI, Bitcoin, TON, Tron. Audited against the docs' extension list (`/javascript/reference/adding-extensions`) plus the packages themselves - the test is whether the package ships a `./waas` export. Aptos, Starknet, and Stellar do not, and Aleo ships only `addAleoWalletStandardExtension`: all four are external/injected-wallet only, so they stay out of a WaaS demo. Tempo and Midnight have no SDK package at all. The Starknet extension additionally triggers MetaMask's `@consensys/starknet-snap` permission dialog when MetaMask is present. Note the docs undersell this: the Tron page never mentions embedded wallets and the tier-2 overview says "three Tier 1 embedded wallets", yet `addTronExtension` calls `addWaasTronExtension` internally - check the package, not the prose. Native token transfers are supported on all registered chains. ERC-20/SPL token transfers are EVM and Solana only. Gas sponsorship is EVM (via ZeroDev) and Solana only.
- No tests in CI today. Add at least smoke coverage for the JWT-protected route in a follow-up.
