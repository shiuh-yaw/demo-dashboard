import SwiftUI

// The reference integration to study. The app renders its OWN native wallet
// list (WalletListView); tapping a wallet drives FireblocksHeadlessConnect — a
// hidden WebView that runs the Dynamic SDK and returns the result over a JS
// bridge — so all connection logic stays in the web layer. Wallets that can't
// go headless fall back to the visible FireblocksConnectFlow automatically.
// The internal test harness (ContentView) is one tap away under "Developer
// tools" but is not part of the integration story.
struct ExampleView: View {
    // ── Replace these two for your app ──────────────────────────────────────
    // Your hosted connect page (used for the visible fallback flow).
    private let flowURL = URL(string: "https://connections.dynamic.dev/")!
    // Your app's registered URL scheme (Info.plist → CFBundleURLTypes).
    private let scheme = "fbapp"
    // ────────────────────────────────────────────────────────────────────────

    @EnvironmentObject private var harness: HarnessModel // only to open dev tools
    @State private var connection: WalletConnection?
    @State private var showDevTools = false

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 8) {
                Image(systemName: "wallet.pass.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Theme.blue)
                Text("Connect a wallet")
                    .font(.title2.bold())
                    .foregroundStyle(Theme.ink)
                Text("Log in with your self-custodial wallet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 12)

            if let c = connection {
                connectedCard(c)
                Button("Use a different wallet") { connection = nil }
                    .font(.footnote)
                    .tint(Theme.blue)
                Spacer()
            } else {
                WalletListView(flowURL: flowURL, scheme: scheme) { connection = $0 }
            }

            Button("Developer tools") { showDevTools = true }
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.bottom, 8)
        }
        .padding(.horizontal, 16)
        .onAppear { FireblocksHeadlessConnect.shared.prewarm() }
        .sheet(isPresented: $showDevTools) {
            ContentView().environmentObject(harness)
        }
    }

    @ViewBuilder
    private func connectedCard(_ c: WalletConnection) -> some View {
        HStack(spacing: 12) {
            WalletImageView(source: c.walletImage)
            VStack(alignment: .leading, spacing: 2) {
                Text(c.walletName.isEmpty ? "Wallet" : c.walletName)
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                Text("\(c.chain) · \(shortAddress(c.address))")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "checkmark.seal.fill").foregroundStyle(Theme.green)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color(hex: 0xF9FAFB))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func shortAddress(_ a: String) -> String {
        a.count > 12 ? "\(a.prefix(6))…\(a.suffix(4))" : a
    }
}
