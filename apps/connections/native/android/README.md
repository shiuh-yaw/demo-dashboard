# Wallet-connect flow — Android (Kotlin)

Same hosted flow as the web, iOS, and React Native guides. The user taps "Connect
wallet", the flow opens in a Chrome Custom Tab, they connect a self-custodial
wallet, and your app receives the result on a custom URL scheme.

This folder is **both** the drop-in module
(`app/src/main/java/com/fireblocks/connect/FireblocksConnect.kt`) and a minimal
runnable sample app.

## What you copy

**Basic:** one file — **`FireblocksConnect.kt`** — the Kotlin analog of iOS's
`FireblocksConnectFlow.swift`. It includes `FireblocksRedirectActivity`, the
Activity that catches the return.

**Advanced (native wallet list, no visible web):** also copy
**`FireblocksHeadlessConnect.kt`**. It runs the connect logic in a **hidden
`WebView`** so your app can render its own native list while all wallet logic
stays in the web layer — the Android analog of iOS's `FireblocksHeadlessConnect`.
See the "Headless" section below. The app links **no wallet SDK**: it loads a
URL, relays JSON over a bridge, opens a deeplink, and renders a list.

## The contract (identical to web / iOS / RN)

**Sent** (appended by `present`):

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

The nonce is verified for you; a mismatch returns `FireblocksConnectResult.Error`.

## Integrate in 3 steps

1. **Add Chrome Custom Tabs** to `app/build.gradle.kts`:

   ```kotlin
   implementation("androidx.browser:browser:1.8.0")
   ```

2. **Register your scheme + the redirect Activity** in `AndroidManifest.xml`
   (replace `fbapp` with your scheme). `singleTask` lets the return dismiss the
   Custom Tab:

   ```xml
   <activity
       android:name="com.fireblocks.connect.FireblocksRedirectActivity"
       android:exported="true"
       android:launchMode="singleTask">
       <intent-filter>
           <action android:name="android.intent.action.VIEW" />
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />
           <data android:scheme="fbapp" android:host="wallet-callback" />
       </intent-filter>
   </activity>
   ```

3. **Call it:**

   ```kotlin
   FireblocksConnect.present(
       context = this,
       flowURL = "https://<hosted-connect-page>/",
       scheme = "fbapp",
   ) { result ->
       when (result) {
           is FireblocksConnectResult.Success -> { /* result.wallet.address, .chain … */ }
           is FireblocksConnectResult.Cancelled -> {}
           is FireblocksConnectResult.Error -> { /* result.reason */ }
       }
   }
   ```

To show the wallet icon, render `walletImage` in a `WebView` `<img>` (it's an SVG
sprite that `ImageView` can't draw) — the same technique the iOS/RN samples use.

## How it maps to iOS

Chrome Custom Tabs is Android's secure, sandboxed in-app browser — the analog of
iOS `ASWebAuthenticationSession`. The one difference: iOS auto-closes the sheet
and hands the result back; Android has no built-in return, so
`FireblocksRedirectActivity` catches the `<scheme>://wallet-callback` deep link
and bounces back to the app. This is the same pattern Google's AppAuth-Android
uses for OAuth. Same `redirect_uri` + `nonce` + `embedded=1` contract as every
platform.

## Gotchas

- **HTTPS required** — the flow mints WalletConnect URIs via WebCrypto (secure
  context).
- **Native deeplinks are faster** than universal links; the hosted page prefers
  them when `embedded=1`.
- **Phantom** finishes in its own in-app browser and returns via the scheme —
  the redirect Activity catches it like any other return.
- **Cancellation** (closing the tab without connecting) isn't auto-detected by
  Custom Tabs; a production app can treat "resumed with no result" as cancelled
  (as AppAuth does) or hold the pending flow in a ViewModel.
- Real wallet round-trips need a **physical device / a device with a wallet
  installed** — not a bare emulator.

---

## Running this sample

Open `android/` in **Android Studio** (it sets up the Gradle wrapper and will
prompt to upgrade the Android Gradle Plugin / Gradle — accept), then Run on a
connected device. The sample points at production
(`https://connections.dynamic.dev/`, `MainActivity.kt`) with the `fbapp` scheme,
which production accepts.

> Versions in the Gradle files (AGP 8.5.2, Kotlin 1.9.24, compileSdk 34) are a
> baseline; let Android Studio reconcile them to your installed toolchain. This
> sample hasn't been built in CI here — it's a reference to compile in your
> environment. `FireblocksConnect.kt` itself is dependency-light (only
> `androidx.browser`) and portable.

---

## Advanced: native wallet list (headless)

Render your **own native list** with no visible web. `FireblocksHeadlessConnect`
runs the connect logic in a hidden `WebView` and talks to it over a bridge:

```kotlin
FireblocksHeadlessConnect.prewarm(this)                 // at launch
FireblocksHeadlessConnect.onWallets = { render(it) }    // the live wallet menu

FireblocksHeadlessConnect.connect(this, "metamask", "evm") { result ->
    when (result) {
        is FireblocksHeadlessConnect.Result.Success -> { /* result.wallet */ }
        is FireblocksHeadlessConnect.Result.FallbackRequired -> { /* visible flow */ }
        is FireblocksHeadlessConnect.Result.Failure -> { /* result.code */ }
    }
}
```

- **The wallet list** is pushed by the engine (derived from the Dynamic
  catalogue) — no static file. Each `Wallet` has `key`, `name`, `icon`,
  `chains`, `mode` (`headless` | `fallback`), `featured`.
- **Auto-fallback**: wallets that can't go headless (Base Account passkey, …)
  return `FallbackRequired`; the sample opens the visible `FireblocksConnect`
  for that wallet (deep-linked via `?wallet=<key>`).
- **Phantom**: route `FireblocksRedirectActivity` to
  `FireblocksHeadlessConnect.handleReturnURL(uri)` first (it uses a redirect
  protocol). The manifest catches `<scheme>://phantom-headless`.
- **Bridge** (JS → native, `@JavascriptInterface` named `fbNative`): `ready`,
  `wallets`, `deeplink`, `opening`, `connected`, `fallback`, `error`, `event`.
  Native → JS: `window.fbHeadless.connect(…)` / `.cancel()` / `.handleReturnURL(…)`.

### Android gotchas (verify on-device)

- **Don't** call `webView.onPause()` on the hidden WebView — that suspends its
  relay socket. It stays alive for a normal app-switch; for long approvals a
  foreground service is the robust option (not included here).
- WebView (not Custom Tabs) is used for the headless engine so we can bridge to
  it. `@JavascriptInterface` callbacks arrive on a binder thread — marshalled to
  the main thread in the engine.

**No wallet logic lives in native** — it loads a URL, relays JSON, opens a
deeplink, holds the list. Everything wallet-specific is JavaScript in the hidden
WebView.
