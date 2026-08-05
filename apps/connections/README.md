# @dynamic-demos/connections

Connect-only wallet flow built on the [Dynamic](https://www.dynamic.xyz/docs/javascript/reference/quickstart) JavaScript SDK, styled as a branded login screen that credits **Fireblocks** as the wallet-connection provider. Supports **EVM** and **Solana** external wallets. On a successful connection it redirects back to a caller-supplied callback with the connection details as URL params.

> Connect-only means we only ever read the public wallet address. The user is never asked to sign a message or approve a transaction.

Ported from [dynamic-labs-oss/iframe-fb](https://github.com/dynamic-labs-oss/iframe-fb). See `AGENTS.md` for the invariants, security notes, and gotchas - read that before changing anything here.

## Run it

```bash
pnpm install              # from the repo root
cp .env.example .env.local
pnpm --filter @dynamic-demos/connections dev   # http://localhost:4013
```

`NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is optional - it falls back to the workspace default. In the [Dynamic dashboard](https://app.dynamic.xyz/dashboard/developer/api) enable **EVM** and **Solana**, add `http://localhost:4013` to **Allowed Origins**, and add a WalletConnect project ID (without one, wallets that aren't installed can't pair).

## Routes

| Route | Chrome | Purpose |
|---|---|---|
| `/` | Shared scenario chrome | Front door: live widget beside the SDK integration panel. |
| `/connect` | **None** | The embed target - point an iframe or native webview here. |
| `/headless` | None | No-UI bridge engine for native hosts. |
| `/headless-test` | Minimal | Drive `/headless` from a browser, no Swift or Kotlin needed. |
| `/callback` | Own card | Default redirect target: shows the params we handed back. |

`/connect` and `/headless` are deliberately chromeless: they render inside someone else's page.

## Redirect contract

Full table in `AGENTS.md`. The short version:

- **In:** `redirect_uri` (alias `redirect_url`) - where to return to; `nonce` - echoed back if present. Also `wallet`, `chain`, `embedded`, `returnScheme`, `debug`.
- **Out:** `address`, `chain` (`evm` | `solana`), `walletName`, `walletImage`, and `nonce` only if one came in.

> **Security:** `redirect_uri` is caller-supplied, so it's an open-redirect surface. Set `NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES` for a strict scheme allow-list, and allow-list permitted `http(s)` hosts before exposing this to untrusted callers. See the Security section of `AGENTS.md`.

## Flow

1. **Home.** Four featured wallets (`FEATURED_WALLETS` in `lib/config.ts`) plus search over Dynamic's full catalogue, and a manual-address option.
2. **Search** filters every wallet Dynamic supports - installed and not, each with its real icon. Not-installed wallets show an **Install** badge that opens the platform install link.
3. **Manual entry** detects the chain live as you type: `0x…` → Polygon, a Base58 key → Solana. Tron is rejected explicitly (its address range overlaps Solana's).
4. **Chain picker**, only when the wallet is installed on more than one chain.
5. **Confirm, then redirect.** A confirmation screen shows the connected wallet, chain and address. The hand-off is explicit - nothing is sent until the user presses **Continue** - so they can check which account came back and "Use a different wallet" to swap first.

Non-installed wallets connect over a minted pairing URI - a QR on desktop, a deeplink on mobile. That path needs no visible page, which is what makes `/headless` possible.

## Native hosts

`native/` carries the iOS (Swift), Android (Kotlin), and React Native harnesses from upstream. They're **reference material for integrators** - excluded from `tsconfig.json`, eslint, and the Next build. The integration panel on `/` reads them off disk (`lib/native-sources.ts`) so the guide can't drift from them.

The React Native harness has no surface in the app today - the panel tabs cover Web / iOS / Android only. See `AGENTS.md` → Gotchas.

Repoint `engineURL` in `FireblocksHeadlessConnect.{swift,kt}` at your own deployment; it still references upstream's.

## Theming

`?theme=<configId>` resolves a dashboard config (sticky `connections_config_id` cookie → `x-connections-config-id` header) and injects `--brand-*` overrides server-side. The widget's own tokens resolve through that palette, so an unthemed render is identical to the standalone POC and a branded one restyles the whole flow. Registered as `DemoConfigKind: "connections"` with no in-dashboard editor - the theme comes from the prospect.
