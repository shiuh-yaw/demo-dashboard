# Wallet-connect flow — React Native

Same hosted flow as the web and iOS guides. The user taps "Connect wallet", the
flow opens in a web auth session, they connect a self-custodial wallet, and your
app receives the result on a custom URL scheme.

This folder is **both** the drop-in module (`FireblocksConnect.ts`) and a runnable
Expo example (`App.tsx`).

## What you copy

One file: **`FireblocksConnect.ts`** — the RN analog of the iOS
`FireblocksConnectFlow.swift`.

## The contract (identical to web & iOS)

**Sent** (appended by `connectWallet`):

| param | value |
|---|---|
| `redirect_uri` | `<yourscheme>://wallet-callback` |
| `nonce` | random, per-attempt |
| `embedded` | `1` — use native deeplinks; avoid redirect protocols that escape to the system browser |

**Returned** and parsed into `WalletConnection`:

| field | meaning |
|---|---|
| `address` | connected wallet address |
| `chain` | `evm` or `solana` |
| `walletName` | display name |
| `walletImage` | icon URL (usually an SVG-sprite URL) |

The nonce is verified for you; a mismatch throws `FireblocksConnectError`.

## Integrate in 3 steps

1. **Install the modules** (Expo or bare RN with Expo modules):

   ```sh
   npx expo install expo-web-browser expo-linking expo-crypto
   ```

2. **Register your URL scheme.** Expo — `app.json`:

   ```json
   { "expo": { "scheme": "myapp" } }
   ```

   Bare RN — add it to `Info.plist` (`CFBundleURLTypes`) and an Android
   intent-filter in `AndroidManifest.xml`.

3. **Call it:**

   ```ts
   import { connectWallet } from "./FireblocksConnect";

   try {
     const wallet = await connectWallet({
       flowURL: "https://<hosted-connect-page>/",
       scheme: "myapp",
     });
     // wallet.address, wallet.chain, wallet.walletName, wallet.walletImage
   } catch (e) {
     // FireblocksConnectCancelled | FireblocksConnectError
   }
   ```

To show the wallet icon, render `walletImage` in a `react-native-webview` `<img>`
(it's an SVG sprite that `<Image>` can't draw) — see `WalletIcon` in `App.tsx`.

## How it maps to iOS

`expo-web-browser`'s `openAuthSessionAsync` is `ASWebAuthenticationSession` on iOS
and Chrome Custom Tabs on Android — the same "open web, return via a callback
scheme" primitive, run ephemerally (no consent prompt). Phantom finishes in its
own in-app browser and returns via the scheme out-of-band; `connectWallet`
handles that with an `expo-linking` listener, so — unlike the raw iOS
integration — you don't wire `onOpenURL` yourself.

## Gotchas (same across platforms)

- **HTTPS required** — the flow mints WalletConnect URIs via WebCrypto (secure
  context).
- **Native deeplinks are faster** than universal links; the hosted page prefers
  them when `embedded=1`.
- **Phantom** has no WalletConnect option; the hosted page routes it to its
  in-app browser and this module catches the return. Validate on device.
- Real wallet round-trips need a **physical device** — wallets don't run in the
  Simulator.

---

## Running this example

Needs a **physical device** (wallets don't run in the Simulator). A **Release**
build embeds the JS, so it runs without a Metro/localhost connection — best for a
demo:

```sh
cd react-native
rm -rf ios node_modules
npm install
npx expo install expo-asset react-native-webview
npx expo prebuild --clean
npx expo run:ios --device --configuration Release
```

The example points at production (`https://connections.dynamic.dev/`, `FLOW_URL` in
`App.tsx`) with the `fbapp` scheme, which production accepts.

First device run:
- **Developer Mode** on the iPhone: Settings → Privacy & Security → Developer
  Mode → on, then reboot.
- **Signing**: if `run:ios` errors on signing, open
  `ios/FireblocksConnectRN.xcworkspace` in Xcode → target → Signing &
  Capabilities → pick your Team, then re-run.

### Toolchain notes (example only — not part of the integration)

This sample pins **Expo SDK 52**. On a recent Xcode (16.3+/26), SDK 52's native
deps need two workarounds, both already wired in:
- `jsEngine: "jsc"` (`app.json`) — skips Hermes so `pod install` doesn't need
  `cmake`.
- `plugins/withFmtConstevalFix.js` — patches the bundled `fmt` so it compiles
  (otherwise "call to consteval function … is not a constant expression").

A current Expo SDK needs neither. If your npm registry serves a newer SDK
(`npm view expo versions`), pin `expo` to it, drop `jsEngine` and the plugin, and
`npx expo install --fix`. The module (`FireblocksConnect.ts`) is SDK-agnostic.

> Iterating on the app's code? Use a dev build instead: `npx expo run:ios
> --device` then `npx expo start --dev-client` (needs the phone and Mac on the
> same Wi-Fi). Release is only for a self-contained, network-independent build.
