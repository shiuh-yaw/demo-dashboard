# Integrating the wallet-connect flow (iOS)

This is a reference for embedding the hosted wallet-connect flow in a native iOS
app. The user taps "Connect wallet", a web flow opens, they connect a
self-custodial wallet, and your app receives the wallet details and continues.

## What you copy

One file: **`Sources/FireblocksConnectFlow.swift`**. Everything else in this project
(`ExampleView`, `ContentView`, `Containers`, `HarnessModel`) is sample UI / our
internal test harness — not part of the integration.

## The contract

You send the flow a return URL and a nonce; it returns the result on that URL.

**Sent** (appended by `FireblocksConnectFlow`):
| param | value |
|---|---|
| `redirect_uri` | `<yourscheme>://wallet-callback` |
| `nonce` | random, per-attempt |
| `embedded` | `1` — tells the page it's in a native container (a Safari-based container can't be detected from JS), so it uses native wallet deeplinks and avoids redirect protocols that would escape to Safari |

**Returned** on the callback URL:
| param | meaning |
|---|---|
| `address` | the connected wallet address |
| `chain` | `evm` or `solana` |
| `walletName` | display name (e.g. "MetaMask") |
| `walletImage` | icon URL (often an SVG-sprite URL) |
| `nonce` | echoed back — **verify it matches what you sent** |

`FireblocksConnectFlow` verifies the nonce for you and rejects a mismatch.

## Steps

1. **Register your URL scheme** in `Info.plist` (`CFBundleURLTypes`). The sample
   uses `fbapp`; use your own and pass it to the flow.

   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array><string>fbapp</string></array>
     </dict>
   </array>
   ```

2. **Present the flow:**

   ```swift
   FireblocksConnectFlow.present(
       flowURL: URL(string: "https://<hosted-connect-page>/")!,
       scheme: "fbapp"
   ) { result in
       switch result {
       case .success(let w):
           // w.address, w.chain, w.walletName, w.walletImage  (nonce verified)
       case .failure(.cancelled):
           break
       case .failure(let error):
           // .nonceMismatch / .malformedResult / .couldNotStart / .invalidURL
       }
   }
   ```

3. **Forward your app's `onOpenURL`.** Most wallets return inside the session,
   but some (Phantom) finish in their own in-app browser and hand the result
   back via the URL scheme — that lands on your App's `onOpenURL`, not the
   session callback. One line makes those complete:

   ```swift
   WindowGroup {
       ContentView()
           .onOpenURL { FireblocksConnectFlow.handleCallbackURL($0) }
   }
   ```

4. **Render the wallet icon** with a WebKit-backed `<img>` if you display it —
   `walletImage` is usually an SVG sprite URL that `UIImage`/`AsyncImage` can't
   draw. See `WalletImageView` in `ContentView.swift` for a 20-line version.

## Recommended container: ASWebAuthenticationSession

`FireblocksConnectFlow` uses `ASWebAuthenticationSession` — Apple's API built for
"open a web page, return via a callback scheme." Why it's the right default:

- **Least code**, native callback handling, no navigation glue.
- **Ephemeral session** (`prefersEphemeralWebBrowserSession = true`): no iOS
  consent prompt, and nothing is persisted between runs — so a completed
  connection isn't *resumed* on the next attempt (a resume can add ~10s).
- Wallet deep links open like they do in Safari.

### If you need a fully embedded / custom-UI experience: WKWebView

Use a `WKWebView` only if the flow must live inside your own in-app browser
chrome. It needs host glue, which the test harness (`Containers.swift`)
demonstrates:

- Intercept non-`http(s)` schemes (`metamask://`, `wc:`) in
  `decidePolicyForNavigationAction` and `UIApplication.open` them; open wallet
  *universal links* externally too (iOS won't route them to the wallet from
  inside a WKWebView).
- Use a **non-persistent** `WKWebsiteDataStore` (same resume-lag reason as
  above).
- Catch the `<yourscheme>://wallet-callback` navigation to receive the result.

`SFSafariViewController` is **not recommended** here: it shares Safari storage
(resume lag) and gives you no navigation control.

## Advanced: native wallet list + headless engine

If you want your app to render its **own native wallet list** (no visible web
UI at all) while keeping every bit of connection logic in the web layer, use
**`FireblocksHeadlessConnect`** instead of presenting the flow.

How it works: a **hidden WKWebView** loads the `/headless` route — the same hosted
page, running the Dynamic SDK with no UI. Your native list drives it over a JS
bridge. For WalletConnect-protocol wallets (MetaMask, Rainbow, Trust, …) the
pairing is relay-based, so nothing needs to be shown; the engine mints a
deeplink, your app opens the wallet, and the approval resolves over a WebSocket.

```swift
FireblocksHeadlessConnect.shared.prewarm()   // at launch — first connect is instant

FireblocksHeadlessConnect.shared.connect(walletKey: "rainbow", chain: "evm") { result in
    switch result {
    case .success(let wallet):        // wallet.address, .chain, …
    case .fallbackRequired(let why):  // can't go headless — open the visible flow
    case .failure(let code, _):       // stable code, e.g. "user_rejected"
    }
}
```

- **The wallet list** is delivered live by the engine — it derives the menu from
  the Dynamic catalogue and pushes it over the bridge (`wallets` message), so
  there's no static file to ship or keep in sync. Each `HeadlessWallet` carries
  `key`, `name`, `icon`, `chains`, `mode` (`headless` | `fallback`), and
  `featured`. Set `FireblocksHeadlessConnect.shared.onWallets = { … }`.
- **Auto-fallback** is built in: wallets with no WalletConnect / MetaMask-URI
  path (Base Account passkey/email, …) return `.fallbackRequired`, and the
  sample opens the visible `FireblocksConnectFlow` for that same wallet
  (deep-linked via `?wallet=<key>`). The user never hits a dead end.
- **Bridge contract** (JS → native, on the `fb` message handler): `ready`,
  `wallets{…}`, `deeplink{url}`, `opening`, `connected{address,chain,…}`,
  `fallback{reason}`, `error{code,message}`, and `event{…}` (a diagnostic
  timeline you can log). Native → JS: `window.fbHeadless.connect(…)` /
  `.cancel()` / `.handleReturnURL(url)` (redirect wallets).
- **Keep the hidden WebView in the view hierarchy** (1×1, hidden). A fully
  detached WKWebView gets suspended by iOS and its relay socket stalls.

## What lives where

**Native has no wallet logic** — no SDK, no crypto, no chain code. It only:
loads a URL, relays JSON messages, opens a deeplink, and holds a background task.
Everything wallet-specific (which wallet, minting, deeplink assembly, Phantom's
redirect, session teardown, the wallet list) is JavaScript in the web layer.

Copy **two files**: `FireblocksHeadlessConnect.swift` (the drop-in engine —
self-contained) and `FireblocksConnectFlow.swift` (the visible fallback + the
shared `WalletConnection` result). `WalletListView` / `ExampleView` are sample
UI you replace with your own.

## Gotchas we hit (so you don't)

- **HTTPS required.** The flow mints WalletConnect URIs via WebCrypto, which
  needs a secure context. Serve the connect page over HTTPS.
- **Native deeplinks are faster.** A wallet *universal* link round-trips through
  the wallet's link server before the app opens; the native scheme opens
  instantly. (The hosted page already prefers native when embedded.)
- **Phantom** is the trickiest wallet: it has no WalletConnect option and its
  redirect protocol returns to the page's https URL (which leaves an embedded
  web view). The hosted page routes it to Phantom's in-app browser when it
  detects a web view. Validate Phantom on whichever container you ship.
- **Verify the nonce.** Always (done for you here).

## Running this sample

```sh
brew install xcodegen
cd ios-harness
IOS_DEV_TEAM=<your-team-id> xcodegen generate   # or set your team in Xcode
open WebViewHarness.xcodeproj
```

Real wallet round-trips require a **physical device** (wallets don't run in the
Simulator). The app opens on the example screen; "Developer tools" opens the
container test harness.
