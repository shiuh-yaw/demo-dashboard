---
name: "@dynamic-demos/exchange"
kind: app
flow_role: wallet
custody: non-custodial
status: experimental
---

# @dynamic-demos/exchange

Exchange: a fictional regional retail exchange puts a non-custodial embedded wallet inside its consumer app. Built for a five-beat sales demo (APAC SE enablement, Brief 04) and reusable as the "exchange re-architecting off a self-built custodial stack" story: social login with silent wallet creation, an in-app yield position, a sponsored transfer with zero ETH, device loss and recovery without a phrase, and a live architecture view of who holds what.

## Capabilities

- Scenario front door at `/` (shared chrome via `buildScenarioChrome`): the sign-in card IS beat 1 - email OTP + the environment's social providers through the shared `LoginForm`, then the embedded EVM wallet is created silently and the session lands on `/portfolio`.
- Exchange shell (`/portfolio`, `/markets`, `/earn`, `/activity`, `/architecture`) with one continuous session across the beats, persisted in `localStorage` (`lib/session/store.tsx`, reducer unit-tested).
- Two backends behind one interface (`lib/backend/types.ts`): **staged** (offline simulation of the 2-of-2 flow, deterministic address per email, the mode for a stage) and **live** (`@dynamic-labs-sdk/client` 1.x on Ethereum Sepolia). `lib/mode.ts` picks: `NEXT_PUBLIC_EXCHANGE_MODE`, else live iff an environment id is set. The SDK is `next/dynamic`-loaded only in live mode.
- Beat 3 sponsored send (`lib/dynamic/evm.ts`): Dynamic's native EVM gas sponsorship (`sendSponsoredTransaction`, the 7702 relayer) when the environment enables it; ZeroDev kernel client in **EIP-7702** mode when the environment sponsors Sepolia through that provider instead; plain viem wallet client otherwise, with a plain-words error on a zero ETH balance. Never ERC-4337.
- Beat 4 device loss: `logout()` + wipe of the SDK's web storage; the next sign-in restores the client share from Dynamic's encrypted backup and the session marks the wallet recovered when the same address reappears.
- Beat 5 architecture view (`components/architecture/`): SVG diagram bound to the session wallet (key-share ids, `thresholdSignatureScheme`, `keyShares[].backupLocation` from the credential), blast-radius toggles, the Shamir / encrypted-at-rest / TSS comparison, and the Fireblocks-vs-Dynamic boundary. The address is first shown here, on purpose.
- Presenter rail (press `P`): show/say/watch cues per beat, do-not-oversell boundaries, lose-device, reveal-address, immersive-chrome and reset controls. Never persisted across a refresh.

## Public surface

- `/` - scenario page: Dynamic site chrome + sign-in card + SDK code panel (`lib/code-steps.ts`, one step per beat).
- `/portfolio`, `/markets`, `/earn`, `/activity`, `/architecture` - the exchange, client-gated on a session; a lost device or signed-out session returns to `/`.
- No API routes. No server state.

Cookie / header contract (D-008): `?theme=<configId>` → cookie `exchange_config_id` → header `x-exchange-config-id` → dashboard config fetch (`lib/get-exchange-config.ts`).

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic **sandbox** env - optional; absent means staged mode (the app must boot with nothing on a stage laptop).
- `NEXT_PUBLIC_EXCHANGE_MODE` - `staged` | `live` - optional override.
- `NEXT_PUBLIC_APP_ENV` - `production` flips sandbox off (D-005). Never for this demo.
- `DASHBOARD_URL` - dashboard origin for brand configs - optional.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` - live-mode balance reads - optional (public RPC fallback).
- `NEXT_PUBLIC_TRACK_URL` - `@dynamic-demos/analytics` ingest base - optional; unset means every emitter is a no-op.

Live mode also needs, in the Dynamic dashboard: Ethereum Sepolia enabled, Google (and/or Apple) social sign-in, embedded wallets on, and - for beat 3 to be sponsored - EVM gas sponsorship enabled for the environment (Enterprise tier, provisioned manually; without it the send falls back to user-paid gas and fails honestly on a zero ETH balance). The presenter rail's "Beat 3 gas" line reports which path is active.

## Analytics taxonomy

`<GtmTracker demoSlug="exchange">` wraps the tree in `app/layout.tsx`; `<IdentityBridge />` fires `authenticated` via `useIdentify`. No `<BookACallCta />` - the site header carries Book a call on the scenario page. `lib/analytics/milestones.ts` owns the `ExchangeMilestone` union. No addresses, emails or hashes in props.

| Milestone | Trigger | Props |
|---|---|---|
| `signed_in` | Sign-in succeeds (staged: simulated; live: SDK `isSignedIn` flips with a user id). | none |
| `authenticated` | Session has a person (`IdentityBridge` → `useIdentify`). | `{ dynamicUserId, email? }` (batch identity, not props) |
| `wallet_funded` | First USDC balance > 0 (staged faucet; live balance poll). | none |
| `position_opened` | Earn deposit recorded. | `{ protocol, asset }` |
| `external_wallet_linked` | An external wallet joins the session (beat 2 curveball). | none |
| `send_initiated` / `send_completed` | Before / after the USDC send; `send_completed` never fires on failure. | `{ asset, sponsored }` |
| `device_lost` | Presenter discards device A. | none |
| `wallet_recovered` | Same wallet address restored on device B. | none |
| `architecture_viewed` | `/architecture` mounts (beat 5). | none |

## Theming

`app/globals.css` pins Exchange's amber palette as local `--brand-*` values (D-030 allows a local pin) and aliases every Tailwind color the app uses to a brand token, so a prospect config restyles the whole exchange through `<ThemeStyleTag overridesOnly>` with no component edits. `--widget-*` compat aliases feed the shared `LoginForm` / `WidgetCard`. Light-only. Unbranded post-sign-in chrome is the shared `SiteHeader` (earn's merged-header rule); branded, or with the presenter's "Immersive chrome" switch, the exchange's own bar renders instead.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003), sandbox only.
- **Fireblocks:** none. The Fireblocks vault appears on the boundary slide as the exchange's treasury; this demo never calls it.
- **Other providers:** none.

## Slots vs invariants

**Slots:** brand (logo, app name, theme), the simulated account name/email, market list, Earn protocol list.

**Invariants:**

- Non-custodial: the app never holds key material; the staged simulation models exactly the 2-of-2 split it describes.
- No `0x` string reaches the screen before beat 5 (`revealAddress`); the send sheet uses a named recipient.
- The Earn position ledger is exchange-side and simulated in both modes; it is labelled as such in live mode. Wiring the Dynamic Earn API is a follow-up, server-side.
- Sponsored sends are 7702 via the SDK (native relayer first, ZeroDev second); never a custom relayer or delegate contract.
- Sandbox-by-default (D-005); testnet only; no real customer names on any screen (Exchange is fictional).
- Branded URLs get `X-Robots-Tag: noindex, nofollow` via `createConfigForwardingMiddleware`.
- `app/opengraph-image.tsx` renders the shared `renderDemoOgImage` for slug `exchange` (generic; no prospect data).

## Data boundaries

- No Postgres, no Redis. Session state → `localStorage` (a demo artefact, not user data). Live user state → Dynamic.

## Deployment

- **Vercel project:** `dynamic-demos-exchange` (not provisioned yet; `pnpm setup:deploy exchange`).
- **Root dir:** `apps/exchange`. **Dev port:** 4015. **Owner:** APAC solutions engineering.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/theme`, `@dynamic-demos/utils`, `@dynamic-demos/types`, `@dynamic-demos/analytics`, `@dynamic-demos/code-highlight`.
**Imported by:** none.

## Examples

```ts
// lib/dynamic/evm.ts - beat 3, the sponsored path
import { createKernelClientForWalletAccount, signEip7702Authorization } from "@dynamic-labs-sdk/zerodev";

const eip7702Auth = await signEip7702Authorization({ smartWalletAccount: zerodev, networkId });
const kernel = await createKernelClientForWalletAccount({ smartWalletAccount: zerodev, eip7702Auth });
const txHash = await kernel.sendTransaction({ to: USDC, data, value: 0n });
```

## Do / Don't

- Do: run the stage from staged mode; rehearse live mode against a sandbox environment first.
- Do: say the boundary before the room asks (the presenter rail lists them).
- Don't: show an address before beat 5, or present gas sponsorship as self-serve.
- Don't: add a Postgres table or a dashboard API for the Earn ledger - it is a demo artefact.

## Open questions / known gaps

- Live-mode "connect an external wallet" lists the EVM wallets the SDK discovers in the browser (EIP-6963, plus the `window.ethereum` fallback) and links one with `connectAndVerifyWithWalletProvider`. Opening the sheet re-requests EIP-6963 announcements; the empty state prints the SDK's provider keys. WalletConnect QR / mobile deep links are not wired here - the Connections demo owns that surface.
- Step-up (environments with it enforced, the default for new ones): linking a wallet needs a `credential:link` elevated token. `lib/dynamic/step-up.ts` checks `checkStepUpAuth`, mints the token silently with the embedded wallet's signature when the backend accepts it, else by email code (inline in the sheet) or a social round trip back to `/portfolio`, and attaches it via `coreConfig.getApiHeaders` because the SDK (through 1.31) does not put it on the link request.
- Live-mode faucet: `app/api/faucet/route.ts` pays real Sepolia USDC from a treasury wallet keyed by the server-only `FAUCET_PRIVATE_KEY` (never `NEXT_PUBLIC_`). Policy in `lib/faucet/policy.ts` (fixed amounts, per-request and per-address daily caps, treasury balance check) is unit-tested. Unset key = the sheet shows the deposit address instead.
- Live mode: the saved session can outlive the SDK's JWT. `Backend.sessionActive` gates the exchange screen, and the sign-in card explains the timeout; signing in with the same account resumes the same wallet.
- Live-mode device loss wipes this browser's SDK storage; a genuinely separate device is the faithful rehearsal.
- Earn positions are simulated in both modes.
