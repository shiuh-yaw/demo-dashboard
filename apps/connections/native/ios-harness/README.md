# WebView Harness

A tiny iOS app for testing the wallet-connect flow **embedded in a native web
view**, the way a real integrator's app would host it. It runs the
same flow in three containers so you can compare their behavior:

| Mode | What it is | Deep links out | Return path |
|---|---|---|---|
| **WKWebView** | Web content inside the app | Host must open them — this app does (see below) | Navigation delegate catches `fbapp://…` |
| **SFSafariVC** | In-app Safari sheet | Handled like Safari | OS routes `fbapp://…` to the app |
| **ASWebAuth** | Apple's auth-flow view | Handled like Safari | Returned in its completion handler |

## The return contract

The web flow is launched with `redirect_uri=fbapp://wallet-callback`. After a
successful connection it redirects there with the result as query params
(`address`, `chain`, `walletName`, `walletImage`, and `nonce` if one was sent).
The harness catches that URL, parses it, and shows the params under **Last
callback**. `fbapp` is a placeholder — the real app registers its own scheme;
change it in `Sources/WebViewHarnessApp.swift`, `project.yml`, and the web app's
`redirect_uri` together.

## Prerequisites

- **Full Xcode** (not just Command Line Tools).
- A **physical iPhone** — the iOS Simulator cannot run MetaMask/Phantom, so the
  wallet round-trip only works on a real device. (The Simulator is still fine
  for exercising the return contract with a mock.)
- A free **Apple ID** for signing.

## Build & run — quick path (XcodeGen)

```sh
brew install xcodegen
cd ios-harness
xcodegen generate
open WebViewHarness.xcodeproj
```

In Xcode: select the **WebViewHarness** target → **Signing & Capabilities** →
pick your **Team** (Automatic signing). Plug in your iPhone, choose it as the run
destination, and press ▶. First run: on the phone, trust the developer cert under
Settings → General → VPN & Device Management.

## Build & run — manual path (no XcodeGen)

1. Xcode → **File → New → Project → iOS → App**. Name it `WebViewHarness`,
   interface **SwiftUI**, language **Swift**.
2. Delete the generated `ContentView.swift` (keep or replace the `…App.swift`).
3. Drag the four files in `Sources/` into the project (check *Copy items if
   needed*): `WebViewHarnessApp.swift`, `HarnessModel.swift`, `Containers.swift`,
   `ContentView.swift`.
4. Target → **Info** → add a **URL Type** with scheme `fbapp`.
5. Target → **Info** → add key **LSApplicationQueriesSchemes** (Array) with the
   wallet schemes from `project.yml` (optional but recommended).
6. Set your signing Team and run on your device.

## Using it

1. Pick a **container** (start with WKWebView — the strict one).
2. The **Flow URL** defaults to the production Vercel build with `?debug`. To test
   unreleased changes, paste the branch's **Vercel preview URL** (keep
   `?redirect_uri=fbapp://wallet-callback&debug`).
3. Tap **Launch flow**, connect a wallet, approve in the wallet app.
4. On return, check **Last callback** for the params and the **Log** for the
   navigation/hand-off trace.

### Notes

- **WKWebView** silently refuses to open wallet URL schemes and won't route
  wallet *universal* links to the wallet app on its own. This app does both in
  its navigation delegate; the **"Open wallet universal links externally"**
  toggle controls the universal-link half so you can observe the raw (broken)
  behavior with it off. A production integration needs the same glue.
- **SFSafariVC / ASWebAuth** behave like Safari for deep links and need no glue,
  but you can't inspect their navigation — rely on **Last callback**.
- If a wallet doesn't come back, check the Log: a failed `open` means the wallet
  app isn't installed or the scheme is wrong.
