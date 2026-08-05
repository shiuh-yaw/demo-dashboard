import SwiftUI
import Security

@MainActor
final class HarnessModel: ObservableObject {
    enum Mode: String, CaseIterable, Identifiable {
        case wkWebView = "WKWebView"
        case safari = "SFSafariVC"
        case authSession = "ASWebAuth"
        var id: String { rawValue }
    }

    struct Result {
        var params: [(name: String, value: String)]
        var nonceMatched: Bool
        var walletName: String?
        var walletImage: String?
        var address: String?
        var chain: String?
    }

    // Just the origin/path - the harness appends redirect_uri, a fresh nonce, and
    // (optionally) debug on each launch. Point this at a local `pnpm dev`
    // (http://localhost:4013/) to test against unreleased changes.
    @Published var baseURLString = "https://connections.dynamic.dev/"
    @Published var mode: Mode = .wkWebView
    @Published var enableDebug = true
    // In WKWebView mode, open wallet universal links externally (host-app glue).
    @Published var forceOpenWalletLinks = true

    // The composed URL for the current presentation (stable while the cover/
    // session is up — regenerating mid-flow would rotate the nonce).
    @Published var activeURL: URL?
    @Published var presentWK = false
    @Published var presentSafari = false

    @Published var log: [String] = []
    @Published var lastResult: Result?

    // The nonce we sent on the current launch; the return must echo it back.
    private var expectedNonce: String?
    // ASWebAuthenticationSession must be retained for its lifetime.
    private var authRunner: AuthSessionRunner?

    // A read-only preview of what will be launched (with a placeholder nonce), so
    // the UI can show the integrator contract.
    var launchPreview: String {
        makeLaunchURL(nonce: "<generated-per-launch>")?.absoluteString ?? "invalid base URL"
    }

    func launch() {
        let nonce = Self.randomNonce()
        guard let url = makeLaunchURL(nonce: nonce) else {
            addLog("⚠️ invalid base URL: \(baseURLString)")
            return
        }
        expectedNonce = nonce
        activeURL = url
        lastResult = nil
        addLog("▶️ launch [\(mode.rawValue)] nonce=\(nonce.prefix(8))… → \(url.absoluteString)")
        switch mode {
        case .wkWebView: presentWK = true
        case .safari: presentSafari = true
        case .authSession: startAuthSession(url)
        }
    }

    func handleCallback(_ url: URL) {
        guard url.scheme?.lowercased() == Harness.callbackScheme else {
            addLog("↩︎ ignored open URL (scheme != \(Harness.callbackScheme)): \(url.absoluteString)")
            return
        }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let dict = Dictionary(items.map { ($0.name, $0.value ?? "") }, uniquingKeysWith: { a, _ in a })
        let returnedNonce = dict["nonce"]
        let matched = expectedNonce != nil && returnedNonce == expectedNonce

        lastResult = Result(
            params: items.map { (name: $0.name, value: $0.value ?? "") },
            nonceMatched: matched,
            walletName: dict["walletName"],
            walletImage: dict["walletImage"],
            address: dict["address"],
            chain: dict["chain"]
        )
        addLog(matched
            ? "✅ callback (nonce verified): \(url.absoluteString)"
            : "⚠️ callback (NONCE MISMATCH — expected \(expectedNonce ?? "nil"), got \(returnedNonce ?? "nil")): \(url.absoluteString)")

        // Close the web view — the flow is done.
        presentWK = false
        presentSafari = false
        expectedNonce = nil
    }

    func addLog(_ line: String) {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        log.insert("\(f.string(from: Date()))  \(line)", at: 0)
        if log.count > 200 { log.removeLast(log.count - 200) }
    }

    func clearLog() {
        log.removeAll()
        lastResult = nil
    }

    // MARK: - URL composition

    private func makeLaunchURL(nonce: String) -> URL? {
        guard var comps = URLComponents(string: baseURLString.trimmingCharacters(in: .whitespaces)) else {
            return nil
        }
        var items = (comps.queryItems ?? []).filter {
            !["redirect_uri", "nonce", "debug", "embedded"].contains($0.name)
        }
        items.append(URLQueryItem(
            name: "redirect_uri",
            value: "\(Harness.callbackScheme)://\(Harness.callbackHost)"
        ))
        items.append(URLQueryItem(name: "nonce", value: nonce))
        // Explicit embedded signal (all harness containers are native hosts).
        items.append(URLQueryItem(name: "embedded", value: "1"))
        if enableDebug {
            items.append(URLQueryItem(name: "debug", value: nil))
        }
        comps.queryItems = items
        return comps.url
    }

    // Cryptographically-random nonce (CSRF-style correlation between launch and
    // return). Not a secret, but must be unguessable.
    static func randomNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        if status != errSecSuccess {
            return UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - ASWebAuth

    private func startAuthSession(_ url: URL) {
        let runner = AuthSessionRunner()
        authRunner = runner
        runner.start(
            url: url,
            callbackScheme: Harness.callbackScheme,
            onLog: { [weak self] in self?.addLog($0) },
            onCallback: { [weak self] in self?.handleCallback($0) }
        )
    }
}
