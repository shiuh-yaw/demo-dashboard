import WebKit
import UIKit

// MARK: - Headless connect engine

/// Runs the hosted Fireblocks connect logic (the Dynamic SDK) inside a HIDDEN
/// WKWebView, so the app can render its own native wallet list and still keep
/// every bit of connection logic in the web layer.
///
/// For WalletConnect-protocol wallets (MetaMask, Rainbow, Trust, …) the pairing
/// is relay-based: the engine mints a URI, we open the wallet via deeplink, the
/// user approves, and the engine's `approval()` promise resolves over a
/// WebSocket — none of which needs a visible page. Wallets with no such path
/// (Phantom's redirect, Coinbase Smart Wallet passkey/email) come back as
/// `.fallbackRequired` so the caller opens the visible `FireblocksConnectFlow`.
///
/// ```swift
/// FireblocksHeadlessConnect.shared.prewarm()        // at launch
/// FireblocksHeadlessConnect.shared.connect(walletKey: "rainbow", chain: "evm") { result in
///     switch result {
///     case .success(let wallet):        // wallet.address, .chain
///     case .fallbackRequired(let why):  // open the visible flow for this wallet
///     case .failure(let code, _):       // stable code, e.g. "user_rejected"
///     }
/// }
/// ```
/// A wallet in the native list, delivered live by the engine (derived from the
/// Dynamic catalogue — no static file). `mode` is `"headless"` (connect silently
/// through the hidden view) or `"fallback"` (open the visible flow).
public struct HeadlessWallet: Decodable, Identifiable {
    public let key: String
    public let name: String
    public let icon: String?
    public let chains: [String]
    public let mode: String
    /// Shown by default; the rest of the catalogue rides along for search.
    public let featured: Bool?
    public var id: String { key }
    public var isMultiChain: Bool { chains.count > 1 }
}

public final class FireblocksHeadlessConnect: NSObject {

    public static let shared = FireblocksHeadlessConnect()

    // Wallet universal-link hosts iOS won't hand to the wallet app from inside a
    // WKWebView (only Phantom's redirect navigates the WebView today) — the nav
    // delegate opens these externally. Self-contained so the module is drop-in.
    private static let walletUniversalLinkHosts: Set<String> = [
        "phantom.app", "phantom.com",
        "link.metamask.io", "metamask.app.link",
        "link.trustwallet.com", "rnbwapp.com", "rainbow.me",
        "www.okx.com", "link.okx.com", "zerion.io",
    ]

    public enum Result {
        case success(WalletConnection)
        case fallbackRequired(reason: String)
        case failure(code: String, message: String)
    }

    /// The no-UI engine page (the `/headless` route). `returnScheme` tells the engine to
    /// point Phantom's redirect at your app scheme so it returns to the app.
    // Point this at your own deployment of apps/connections.
    public var engineURL = URL(string: "https://connections.dynamic.dev/headless?returnScheme=fbapp")!

    /// If the engine hasn't even produced a deeplink within this window, give up
    /// and fall back to the visible flow. Cancelled once the deeplink arrives —
    /// after that we wait indefinitely for the user to approve (or cancel).
    public var startupTimeout: TimeInterval = 20

    private var webView: WKWebView?
    private var ready = false
    private var pendingReadyWork: [() -> Void] = []
    private var handlers: [String: (Result) -> Void] = [:]
    private var timers: [String: Timer] = [:]
    private var counter = 0

    /// The wallet menu, pushed by the engine once it's ready (derived live from
    /// the Dynamic catalogue — no static walletbook file). Set the callback to
    /// receive it; the last value is replayed immediately if already delivered.
    private var walletsList: [HeadlessWallet] = []
    var onWallets: (([HeadlessWallet]) -> Void)? {
        didSet { if !walletsList.isEmpty { onWallets?(walletsList) } }
    }
    // Keeps the app (and thus the hidden WebView's relay socket) alive for the
    // ~30s the user spends approving in the wallet, so the session lands the
    // instant they return instead of after a reconnect.
    private var bgTask: UIBackgroundTaskIdentifier = .invalid

    private override init() { super.init() }

    // MARK: Public API

    /// Build and load the hidden WebView ahead of time so the first connection
    /// isn't slowed by SDK init + relay connect. Safe to call more than once.
    public func prewarm() {
        DispatchQueue.main.async { self.ensureWebView() }
    }

    public func connect(
        walletKey: String,
        chain: String?,
        onResult: @escaping (Result) -> Void
    ) {
        DispatchQueue.main.async {
            self.ensureWebView()
            // A previous attempt is still in flight (e.g. the user opened MetaMask,
            // ignored the prompt, and is now trying another wallet). The SDK can
            // hold a stuck pending connection that blocks the next mint — reset to
            // a fresh engine so the new wallet gets a clean slate.
            if !self.handlers.isEmpty { self.resetEngine() }
            self.counter += 1
            let requestId = "req-\(self.counter)"
            self.handlers[requestId] = onResult
            self.scheduleStartupTimeout(requestId)
            let work: () -> Void = { [weak self] in
                self?.drive(requestId: requestId, walletKey: walletKey, chain: chain)
            }
            if self.ready { work() } else { self.pendingReadyWork.append(work) }
        }
    }

    // Reload the hidden WebView to abandon a stuck previous attempt. The reloaded
    // page re-fires `ready` (flushing any queued connect) and re-pushes the list.
    private func resetEngine() {
        handlers.removeAll()
        timers.values.forEach { $0.invalidate() }
        timers.removeAll()
        endBackgroundTask()
        ready = false
        pendingReadyWork.removeAll()
        webView?.reload()
    }

    /// Abort the in-flight attempt (e.g. the user backed out of the list).
    public func cancel() {
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript("window.fbHeadless && window.fbHeadless.cancel('');", completionHandler: nil)
            self.handlers.removeAll()
            self.timers.values.forEach { $0.invalidate() }
            self.timers.removeAll()
            self.endBackgroundTask()
        }
    }

    // MARK: WebView lifecycle

    private func ensureWebView() {
        guard webView == nil else { return }
        let config = WKWebViewConfiguration()
        // Ephemeral, per-launch — a connect-only flow needs nothing persisted,
        // and the persistent store's slow session-resume is what makes repeat
        // launches sluggish (same rationale as WebViewContainer).
        config.websiteDataStore = .nonPersistent()
        let ucc = WKUserContentController()
        ucc.add(ScriptMessageProxy(self), name: "fb")
        config.userContentController = ucc

        let wv = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), configuration: config)
        wv.isHidden = true
        // The engine navigates to wallet deeplinks (e.g. Phantom's redirect); iOS
        // won't open those from inside a WKWebView, so the delegate does.
        wv.navigationDelegate = self
        wv.uiDelegate = self
        // A fully-detached WKWebView gets throttled/suspended by iOS. Keeping it
        // in the window (hidden, 1×1) lets its JS + relay WebSocket keep running.
        Self.keyWindow()?.addSubview(wv)
        wv.load(URLRequest(url: engineURL))
        webView = wv
    }

    /// Called from the app's `onOpenURL` when Phantom (or another redirect
    /// wallet) returns to the app's custom scheme. Forwards the URL into the
    /// hidden WebView so the engine can complete the connection. Returns `true`
    /// if it consumed the URL.
    @discardableResult
    public func handleReturnURL(_ url: URL) -> Bool {
        guard url.host?.lowercased() == "phantom-headless" else { return false }
        let js = "window.fbHeadless && window.fbHeadless.handleReturnURL(\(Self.jsString(url.absoluteString)))"
        DispatchQueue.main.async { self.webView?.evaluateJavaScript(js, completionHandler: nil) }
        return true
    }

    // Encode a Swift string as a safe JS string literal (quotes + escaping).
    private static func jsString(_ s: String) -> String {
        guard
            let data = try? JSONSerialization.data(withJSONObject: [s]),
            let json = String(data: data, encoding: .utf8)
        else { return "\"\"" }
        return String(json.dropFirst().dropLast()) // ["..."] → "..."
    }

    private func drive(requestId: String, walletKey: String, chain: String?) {
        var params: [String: String] = ["requestId": requestId, "walletKey": walletKey]
        if let chain { params["chain"] = chain }
        guard
            let data = try? JSONSerialization.data(withJSONObject: params),
            let json = String(data: data, encoding: .utf8)
        else { return }
        webView?.evaluateJavaScript("window.fbHeadless && window.fbHeadless.connect(\(json));", completionHandler: nil)
    }

    // MARK: Bridge

    fileprivate func handleMessage(_ body: Any) {
        guard
            let str = body as? String,
            let data = str.data(using: .utf8),
            let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
            let type = obj["type"] as? String
        else { return }

        switch type {
        case "ready":
            ready = true
            let work = pendingReadyWork
            pendingReadyWork = []
            work.forEach { $0() }

        case "wallets":
            if let raw = obj["wallets"],
               let data = try? JSONSerialization.data(withJSONObject: raw),
               let list = try? JSONDecoder().decode([HeadlessWallet].self, from: data) {
                walletsList = list
                onWallets?(list)
            }

        case "deeplink":
            // The startup window is satisfied — stop the fallback timer; the user
            // may take a while to approve now. Keep the app alive so the relay
            // socket receives the approval while we're backgrounded.
            cancelTimer(obj["requestId"] as? String)
            beginBackgroundTask()
            if let url = obj["url"] as? String, let u = URL(string: url) {
                UIApplication.shared.open(u, options: [:], completionHandler: nil)
            }

        case "opening":
            // The wallet is being opened via WebView navigation (Phantom). Same
            // as deeplink: stop the fallback timer, keep alive, wait for the user.
            cancelTimer(obj["requestId"] as? String)
            beginBackgroundTask()

        case "connected":
            finish(obj["requestId"] as? String, .success(WalletConnection(
                address: obj["address"] as? String ?? "",
                chain: obj["chain"] as? String ?? "",
                walletName: obj["walletName"] as? String ?? "",
                walletImage: obj["walletImage"] as? String ?? ""
            )))

        case "fallback":
            finish(obj["requestId"] as? String, .fallbackRequired(reason: obj["reason"] as? String ?? ""))

        case "error":
            finish(
                obj["requestId"] as? String,
                .failure(code: obj["code"] as? String ?? "unknown", message: obj["message"] as? String ?? "")
            )

        case "event":
            break // diagnostics timeline — hook up logging/analytics here if wanted

        default:
            break
        }
    }

    private func finish(_ requestId: String?, _ result: Result) {
        guard let requestId, let handler = handlers[requestId] else { return }
        handlers[requestId] = nil
        timers[requestId]?.invalidate()
        timers[requestId] = nil
        if handlers.isEmpty { endBackgroundTask() }
        DispatchQueue.main.async { handler(result) }
    }

    private func scheduleStartupTimeout(_ requestId: String) {
        let timer = Timer.scheduledTimer(withTimeInterval: startupTimeout, repeats: false) { [weak self] _ in
            self?.finish(requestId, .fallbackRequired(reason: "headless startup timeout"))
        }
        timers[requestId] = timer
    }

    private func cancelTimer(_ requestId: String?) {
        guard let requestId else { return }
        timers[requestId]?.invalidate()
        timers[requestId] = nil
    }

    private func beginBackgroundTask() {
        endBackgroundTask()
        bgTask = UIApplication.shared.beginBackgroundTask(withName: "fb-headless-connect") { [weak self] in
            self?.endBackgroundTask() // iOS is reclaiming the task — release it.
        }
    }

    private func endBackgroundTask() {
        guard bgTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(bgTask)
        bgTask = .invalid
    }

    private static func keyWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
    }
}

// MARK: - Navigation: open wallet deeplinks the WebView can't

// The engine (Phantom's redirect) navigates the WebView to wallet deeplinks and
// universal links. iOS won't hand those to the wallet app from inside a
// WKWebView, so intercept and open them externally — the same glue the visible
// WKWebView container uses. The engine's own page load (https) is allowed.
extension FireblocksHeadlessConnect: WKNavigationDelegate, WKUIDelegate {
    public func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else { return decisionHandler(.allow) }
        let scheme = (url.scheme ?? "").lowercased()
        if scheme != "http", scheme != "https", scheme != "about", scheme != "blob", scheme != "data" {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            return decisionHandler(.cancel)
        }
        if let host = url.host?.lowercased(),
           Self.walletUniversalLinkHosts.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    // Some SDKs open the wallet via window.open rather than a location change.
    public func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            let scheme = (url.scheme ?? "").lowercased()
            if scheme != "http", scheme != "https" {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
        return nil
    }
}

// MARK: - Weak message-handler proxy

// WKUserContentController retains its message handlers; a direct `add(self, …)`
// would create a retain cycle (webView → config → controller → self → webView).
// This weak proxy breaks it.
private final class ScriptMessageProxy: NSObject, WKScriptMessageHandler {
    weak var target: FireblocksHeadlessConnect?
    init(_ target: FireblocksHeadlessConnect) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.handleMessage(message.body)
    }
}
