import SwiftUI
import UIKit
import WebKit

// Palette mirrored from the web flow's styles.css.
extension Color {
    init(hex: UInt) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1
        )
    }
}

enum Theme {
    static let blue = Color(hex: 0x1877F2)   // Accent
    static let ink = Color(hex: 0x0E121B)    // near-black text
    static let muted = Color(hex: 0x606770)
    static let green = Color(hex: 0x12B76A)
}

struct ContentView: View {
    @EnvironmentObject var model: HarnessModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Container") {
                    Picker("Mode", selection: $model.mode) {
                        ForEach(HarnessModel.Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if model.mode == .wkWebView {
                        Toggle("Open wallet universal links externally", isOn: $model.forceOpenWalletLinks)
                            .font(.footnote)
                    }
                    Toggle("Show flow debug panel (?debug)", isOn: $model.enableDebug)
                        .font(.footnote)
                }

                Section {
                    TextField("https://…", text: $model.baseURLString, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .font(.system(.footnote, design: .monospaced))

                    Button(action: model.launch) {
                        Text("Launch flow")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(Theme.blue)
                    .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                } header: {
                    Text("Flow base URL")
                } footer: {
                    Text("Launched as:\n\(model.launchPreview)")
                        .font(.system(.caption2, design: .monospaced))
                }

                resultSection

                Section {
                    ForEach(Array(model.log.enumerated()), id: \.offset) { _, line in
                        Text(line)
                            .font(.system(.caption2, design: .monospaced))
                            .textSelection(.enabled)
                    }
                } header: {
                    HStack {
                        Text("Log")
                        Spacer()
                        Button("Clear") { model.clearLog() }
                            .font(.caption)
                    }
                } footer: {
                    HStack(spacing: 6) {
                        Image(systemName: "lock.shield.fill")
                            .foregroundStyle(Theme.ink)
                        Text("SECURED BY FIREBLOCKS")
                            .font(.caption2.weight(.semibold))
                            .tracking(0.5)
                            .foregroundStyle(Theme.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                }
            }
            .tint(Theme.blue)
            .navigationTitle("Test harness")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $model.presentWK) {
                if let url = model.activeURL {
                    WKWebViewScreen(url: url)
                }
            }
            .fullScreenCover(isPresented: $model.presentSafari) {
                if let url = model.activeURL {
                    SafariContainer(url: url)
                        .ignoresSafeArea()
                }
            }
        }
    }

    @ViewBuilder
    private var resultSection: some View {
        Section("Connection result") {
            if let r = model.lastResult {
                HStack(spacing: 10) {
                    WalletImageView(source: r.walletImage)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.walletName?.isEmpty == false ? r.walletName! : "Wallet connected")
                            .font(.headline)
                            .foregroundStyle(Theme.ink)
                        HStack(spacing: 5) {
                            Image(systemName: r.nonceMatched ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                                .foregroundStyle(r.nonceMatched ? Theme.green : .orange)
                            Text(r.nonceMatched ? "nonce verified" : "nonce did NOT match")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                if let chain = r.chain, !chain.isEmpty { labeled("chain", chain) }
                if let addr = r.address, !addr.isEmpty { labeled("address", addr) }
                DisclosureGroup("all params (\(r.params.count))") {
                    ForEach(r.params, id: \.name) { row in
                        labeled(row.name, row.value)
                    }
                }
                .font(.footnote)
                .tint(Theme.blue)
            } else {
                Text("No connection yet. Launch the flow and connect a wallet.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func labeled(_ key: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(key)
                .foregroundStyle(.secondary)
                .frame(width: 88, alignment: .leading)
            Text(value)
                .font(.system(.footnote, design: .monospaced))
                .foregroundStyle(Theme.ink)
                .textSelection(.enabled)
        }
    }
}

// Renders the wallet icon returned in `walletImage`. Dynamic serves most icons
// as SVG sprites (e.g. sprite.svg#rainbow), which UIImage/AsyncImage can't draw,
// so we render through a tiny WebKit-backed <img> — it handles SVG, PNG, and
// data URIs exactly like a browser. Falls back to a placeholder when empty.
struct WalletImageView: View {
    let source: String?

    var body: some View {
        Group {
            if let s = source, !s.isEmpty {
                WalletIconWeb(source: s)
            } else {
                Image(systemName: "wallet.pass.fill").foregroundStyle(.secondary)
            }
        }
        .frame(width: 44, height: 44)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .stroke(Color.black.opacity(0.08))
        )
    }
}

// A WKWebView sized to an icon, showing the source in a centered, contained
// <img>. Transparent background so it sits on the card cleanly.
private struct WalletIconWeb: UIViewRepresentable {
    let source: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let safe = source
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "\"", with: "&quot;")
        let html = """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;height:100%;background:transparent}
        body{display:flex;align-items:center;justify-content:center}
        img{width:100%;height:100%;object-fit:contain;padding:5px;box-sizing:border-box}</style>
        </head><body><img src="\(safe)"></body></html>
        """
        // A real base URL lets the remote SVG/PNG load; harmless for data URIs.
        webView.loadHTMLString(html, baseURL: URL(string: "https://iconic.dynamic-static-assets.com/"))
    }

    // Release the icon's web-content process when it scrolls away / the result
    // clears, rather than holding it for the app's lifetime.
    static func dismantleUIView(_ webView: WKWebView, coordinator: ()) {
        webView.stopLoading()
        webView.loadHTMLString("", baseURL: nil)
    }
}

// Chrome around the WKWebView: a Close button (the web flow can't dismiss its
// own host) and a Reload for quick iteration.
struct WKWebViewScreen: View {
    let url: URL
    @EnvironmentObject var model: HarnessModel
    @State private var reloadToken = 0

    var body: some View {
        NavigationStack {
            WebViewContainer(
                url: url,
                reloadToken: reloadToken,
                forceOpenWalletLinks: model.forceOpenWalletLinks,
                onLog: { model.addLog($0) },
                onCallback: { model.handleCallback($0) }
            )
            .ignoresSafeArea(edges: .bottom)
            .navigationTitle("WKWebView")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { model.presentWK = false }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        reloadToken += 1
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .tint(Theme.blue)
        }
    }
}
