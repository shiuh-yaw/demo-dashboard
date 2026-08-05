import SwiftUI

// Shared constants for the harness. The callback scheme is the custom URL scheme
// the app registers (see Info.plist / project.yml) and the same one the web flow
// is told to redirect to via `redirect_uri=fbapp://wallet-callback`.
enum Harness {
    static let callbackScheme = "fbapp"
    static let callbackHost = "wallet-callback"

    // Points at the production Vercel build with the custom-scheme return + the
    // on-screen debug panel enabled. Swap for a per-branch preview URL to test
    // unreleased changes.
    static let defaultURL =
        "https://connections.dynamic.dev/?redirect_uri=fbapp://wallet-callback&debug"

    // Wallet universal-link hosts. Inside a WKWebView, iOS does NOT hand these to
    // the wallet app on its own — the host must detect and open them. A real
    // integrator's app needs the same list (or a broader rule). Used only in
    // WKWebView mode; SFSafariVC / ASWebAuth route them like Safari.
    static let walletUniversalLinkHosts: Set<String> = [
        "link.metamask.io", "metamask.app.link",
        "phantom.app", "phantom.com",
        "link.trustwallet.com",
        "rnbwapp.com", "rainbow.me",
        "go.cb-w.com", "go.base.app",
        "www.okx.com", "link.okx.com",
        "link.argent.xyz", "zerion.io",
    ]
}

@main
struct WebViewHarnessApp: App {
    @StateObject private var model = HarnessModel()

    var body: some Scene {
        WindowGroup {
            // The Meta-facing reference lives in ExampleView; the internal test
            // harness (ContentView) is reachable from it under "Developer tools".
            ExampleView()
                .environmentObject(model)
                // Custom-scheme returns routed by the OS arrive here. Give the
                // active FireblocksConnectFlow (the example) first crack — needed
                // for wallets like Phantom that return from their own in-app
                // browser rather than inside the ASWebAuth session. Otherwise
                // it's a SFSafariVC test-mode return, handled by the harness.
                .onOpenURL { url in
                    // Headless Phantom returns to <scheme>://phantom-headless — let
                    // the headless engine consume it first. Then the visible flow's
                    // out-of-band return, then the SFSafariVC test-mode return.
                    if FireblocksHeadlessConnect.shared.handleReturnURL(url) { return }
                    if !FireblocksConnectFlow.handleCallbackURL(url) {
                        model.handleCallback(url)
                    }
                }
        }
    }
}
