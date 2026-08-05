import SwiftUI
import WebKit
import SafariServices
import AuthenticationServices

// MARK: - WKWebView

// The most restrictive container, and the one that needs host-app glue: iOS
// won't open custom URL schemes (metamask://, wc:) or wallet universal links on
// its own here, so the navigation delegate does it. It also catches the
// fbapp://wallet-callback return directly (no OS round-trip needed).
struct WebViewContainer: UIViewRepresentable {
    let url: URL
    let reloadToken: Int
    let forceOpenWalletLinks: Bool
    let onLog: (String) -> Void
    let onCallback: (URL) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(forceOpenWalletLinks: forceOpenWalletLinks, onLog: onLog, onCallback: onCallback)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Ephemeral, per-launch storage. The default store is persistent and
        // shared across launches, so a completed connection leaves a session
        // behind that the wallet SDK tries to RESUME on the next run (MetaMask's
        // resume alone is ~10s) — that's why the 2nd flow is slow. A connect-only
        // flow needs nothing to persist between runs, so start each one clean.
        config.websiteDataStore = .nonPersistent()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        context.coordinator.lastReloadToken = reloadToken
        webView.load(URLRequest(url: url))
        return webView
    }

    // Free the web-content process promptly when the cover dismisses instead of
    // waiting on ARC — the flow page (Dynamic SDK + WalletConnect + MetaMask SDK)
    // is heavy, and lingering instances across repeated launches are what push
    // the app into a memory (jetsam) termination.
    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.stopLoading()
        webView.navigationDelegate = nil
        webView.uiDelegate = nil
        webView.loadHTMLString("", baseURL: nil)
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.forceOpenWalletLinks = forceOpenWalletLinks
        if reloadToken != context.coordinator.lastReloadToken {
            context.coordinator.lastReloadToken = reloadToken
            webView.reload()
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var forceOpenWalletLinks: Bool
        var lastReloadToken = 0
        let onLog: (String) -> Void
        let onCallback: (URL) -> Void

        init(forceOpenWalletLinks: Bool, onLog: @escaping (String) -> Void, onCallback: @escaping (URL) -> Void) {
            self.forceOpenWalletLinks = forceOpenWalletLinks
            self.onLog = onLog
            self.onCallback = onCallback
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            let scheme = (url.scheme ?? "").lowercased()

            // 1) Our return contract.
            if scheme == Harness.callbackScheme {
                onCallback(url)
                decisionHandler(.cancel)
                return
            }

            // 2) Wallet custom schemes (metamask://, phantom://, wc:, ...).
            //    WKWebView silently fails to navigate to these; open them.
            if scheme != "http", scheme != "https", scheme != "about",
               scheme != "blob", scheme != "data" {
                openExternally(url, reason: "custom-scheme")
                decisionHandler(.cancel)
                return
            }

            // 3) Wallet universal links (https). iOS won't route these to the
            //    wallet app from inside a WKWebView, so opt to open them.
            if forceOpenWalletLinks, let host = url.host?.lowercased(),
               Harness.walletUniversalLinkHosts.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
                openExternally(url, reason: "wallet-universal-link")
                decisionHandler(.cancel)
                return
            }

            onLog("· nav(\(navigationAction.navigationType.rawValue)): \(url.absoluteString)")
            decisionHandler(.allow)
        }

        private func openExternally(_ url: URL, reason: String) {
            onLog("↗️ open [\(reason)]: \(url.absoluteString)")
            UIApplication.shared.open(url, options: [:]) { [onLog] ok in
                if !ok { onLog("⚠️ open failed (no app for \(url.scheme ?? "?"):)") }
            }
        }

        // target="_blank" (e.g. the install-link taps) has no window to open in a
        // WKWebView; load it in the main frame or hand off external schemes.
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                let scheme = (url.scheme ?? "").lowercased()
                if scheme == "http" || scheme == "https" {
                    webView.load(navigationAction.request)
                } else {
                    openExternally(url, reason: "target=_blank")
                }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            onLog("✗ provisional fail: \(error.localizedDescription)")
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            onLog("✗ nav fail: \(error.localizedDescription)")
        }
    }
}

// MARK: - SFSafariViewController

// A full Safari instance in-app. Deep links / universal links behave like
// Safari (no host glue needed), but we can't intercept navigation — the
// fbapp:// return is routed by the OS to the app's .onOpenURL.
struct SafariContainer: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

// MARK: - ASWebAuthenticationSession

// Purpose-built for "open web, redirect back via a callback scheme." It takes
// the callback scheme up front and returns the callback URL in its completion
// handler — the cleanest of the three for this flow.
final class AuthSessionRunner: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func start(
        url: URL,
        callbackScheme: String,
        onLog: @escaping (String) -> Void,
        onCallback: @escaping (URL) -> Void
    ) {
        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: callbackScheme
        ) { callbackURL, error in
            if let callbackURL {
                onCallback(callbackURL)
            } else if let error {
                onLog("✗ auth session: \(error.localizedDescription)")
            }
        }
        session.presentationContextProvider = self
        // Ephemeral = no shared Safari cookies, which means iOS skips the
        // "<App> wants to use <domain> to sign in" consent alert. A fresh
        // session per launch is what we want for a wallet connect anyway.
        session.prefersEphemeralWebBrowserSession = true
        self.session = session
        if !session.start() {
            onLog("✗ auth session failed to start")
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
