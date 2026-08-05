import AuthenticationServices
import Security
import UIKit

// MARK: - Result

/// A wallet the user connected through the hosted Fireblocks flow.
public struct WalletConnection {
    /// The connected wallet's public address.
    public let address: String
    /// Chain family: `"evm"` or `"solana"`.
    public let chain: String
    /// Display name, e.g. `"MetaMask"`.
    public let walletName: String
    /// Icon URL — often an SVG-sprite URL, so render it with a WebKit-backed
    /// `<img>` rather than `UIImage`.
    public let walletImage: String
}

/// Why a connection attempt ended without a `WalletConnection`.
public enum FireblocksConnectError: Error {
    case invalidURL
    /// The user dismissed the sheet.
    case cancelled
    /// The returned nonce didn't match the one we sent — rejected (possible CSRF).
    case nonceMismatch
    /// No address, or the callback couldn't be parsed.
    case malformedResult
    case couldNotStart
}

// MARK: - Flow

/// Connect a self-custodial wallet through a hosted Fireblocks page — no SDK.
///
/// ```swift
/// FireblocksConnectFlow.present(
///     flowURL: URL(string: "https://connect.example.com/")!,
///     scheme: "myapp"                     // your Info.plist URL scheme
/// ) { result in
///     switch result {
///     case .success(let wallet): print(wallet.address, wallet.chain)
///     case .failure(let error):  print(error)
///     }
/// }
/// ```
///
/// The page opens in `ASWebAuthenticationSession` — Apple's API for "open web,
/// return via a callback scheme." It runs ephemerally, so there's no consent
/// prompt and no session left to resume on the next run. This type appends
/// `redirect_uri`, a random `nonce`, and `embedded=1` to your URL, verifies the
/// returned nonce, and calls `completion` on the main thread.
public final class FireblocksConnectFlow: NSObject {

    /// Present the flow. The instance keeps itself alive until it finishes, so
    /// the caller doesn't need to retain the return value.
    @discardableResult
    public static func present(
        flowURL: URL,
        scheme: String,
        completion: @escaping (Result<WalletConnection, FireblocksConnectError>) -> Void
    ) -> FireblocksConnectFlow {
        let flow = FireblocksConnectFlow(scheme: scheme, completion: completion)
        flow.start(flowURL: flowURL)
        return flow
    }

    // MARK: Private

    private static let callbackHost = "wallet-callback"

    private let scheme: String
    private let completion: (Result<WalletConnection, FireblocksConnectError>) -> Void
    private let nonce = FireblocksConnectFlow.makeNonce()
    private var session: ASWebAuthenticationSession?
    private var selfReference: FireblocksConnectFlow?
    private var didFinish = false

    /// The flow currently on screen, so an app-level `open(URL:)` can complete it.
    private static weak var active: FireblocksConnectFlow?

    private init(
        scheme: String,
        completion: @escaping (Result<WalletConnection, FireblocksConnectError>) -> Void
    ) {
        self.scheme = scheme
        self.completion = completion
        super.init()
        selfReference = self
    }

    private func start(flowURL: URL) {
        guard let url = buildURL(from: flowURL) else { return finish(.failure(.invalidURL)) }
        FireblocksConnectFlow.active = self

        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
            self?.handle(callback: callback, error: error)
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = true
        self.session = session

        if !session.start() { finish(.failure(.couldNotStart)) }
    }

    /// Append our contract params, replacing any the caller already set.
    private func buildURL(from flowURL: URL) -> URL? {
        guard var components = URLComponents(url: flowURL, resolvingAgainstBaseURL: false) else { return nil }
        components.queryItems =
            (components.queryItems ?? []).filter { !["redirect_uri", "nonce", "embedded"].contains($0.name) }
            + [
                URLQueryItem(name: "redirect_uri", value: "\(scheme)://\(Self.callbackHost)"),
                URLQueryItem(name: "nonce", value: nonce),
                URLQueryItem(name: "embedded", value: "1"),
            ]
        return components.url
    }

    private func handle(callback: URL?, error: Error?) {
        if let error {
            let cancelled = (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue
            return finish(.failure(cancelled ? .cancelled : .couldNotStart))
        }
        guard let callback,
              let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems
        else { return finish(.failure(.malformedResult)) }

        let values = Dictionary(items.map { ($0.name, $0.value ?? "") }, uniquingKeysWith: { first, _ in first })
        guard values["nonce"] == nonce else { return finish(.failure(.nonceMismatch)) }
        guard let address = values["address"], !address.isEmpty else { return finish(.failure(.malformedResult)) }

        finish(.success(WalletConnection(
            address: address,
            chain: values["chain"] ?? "",
            walletName: values["walletName"] ?? "",
            walletImage: values["walletImage"] ?? ""
        )))
    }

    private func finish(_ result: Result<WalletConnection, FireblocksConnectError>) {
        DispatchQueue.main.async {
            guard !self.didFinish else { return } // ignore a second completion
            self.didFinish = true
            if FireblocksConnectFlow.active === self { FireblocksConnectFlow.active = nil }
            self.completion(result)
            self.selfReference = nil // release
        }
    }

    /// A cryptographically-random value that correlates this launch with its
    /// return (CSRF protection). Not a secret, but must be unguessable.
    private static func makeNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    // MARK: Out-of-band return

    /// Complete an in-flight flow from an app-level `open(URL:)`.
    ///
    /// Most wallets return *inside* the ASWebAuth session, so you don't need
    /// this. But some (e.g. Phantom) finish in their own in-app browser and hand
    /// the result back via the URL scheme — that lands on your App's
    /// `.onOpenURL`, not the session callback. Forward it here so those complete
    /// and the sheet dismisses. Returns `true` if it consumed the URL.
    @discardableResult
    public static func handleCallbackURL(_ url: URL) -> Bool {
        guard let flow = active,
              url.scheme?.lowercased() == flow.scheme.lowercased()
        else { return false }
        flow.handle(callback: url, error: nil) // deliver result (guards double-finish)
        flow.session?.cancel()                 // dismiss the still-open sheet
        return true
    }
}

// MARK: - Presentation anchor

extension FireblocksConnectFlow: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
