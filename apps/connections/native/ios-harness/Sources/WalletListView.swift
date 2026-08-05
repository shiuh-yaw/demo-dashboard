import SwiftUI

// MARK: - Native wallet list

/// The app-owned wallet picker. Renders the list natively and, on tap, drives
/// the headless engine (or the visible flow for fallback wallets). All the
/// connection logic — and the wallet list itself — comes from the web layer.
struct WalletListView: View {
    /// Your hosted connect page (used only for the visible fallback flow).
    let flowURL: URL
    /// Your app's registered URL scheme (fallback flow's callback).
    let scheme: String
    let onConnected: (WalletConnection) -> Void

    @State private var wallets: [HeadlessWallet] = []
    @State private var connectingKey: String?
    @State private var chainPickerFor: HeadlessWallet?
    @State private var errorText: String?
    @State private var search = ""

    private var filtered: [HeadlessWallet] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        // Default: just the featured wallets (like the web home). While
        // searching: span the whole catalogue.
        guard !q.isEmpty else { return wallets.filter { $0.featured == true } }
        return wallets.filter { $0.name.lowercased().contains(q) || $0.key.lowercased().contains(q) }
    }

    var body: some View {
        Group {
            if let key = connectingKey, let wallet = wallets.first(where: { $0.key == key }) {
                // Show a dedicated connecting screen while the engine mints /
                // the wallet opens — otherwise the list would flash back between
                // picking a chain and the wallet opening.
                connectingView(wallet)
            } else if let wallet = chainPickerFor {
                chainPicker(wallet)
            } else {
                walletList
            }
        }
        // The engine pushes the wallet list once it's ready (prewarmed at launch).
        .onAppear { FireblocksHeadlessConnect.shared.onWallets = { wallets = $0 } }
    }

    @ViewBuilder
    private func connectingView(_ wallet: HeadlessWallet) -> some View {
        VStack(spacing: 16) {
            Spacer()
            WalletImageView(source: wallet.icon)
            Text("Opening \(wallet.name)…").font(.headline).foregroundStyle(Theme.ink)
            Text("Approve the connection in \(wallet.name), then you'll come back here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            ProgressView().padding(.top, 4)
            Spacer()
            Button("Cancel") {
                FireblocksHeadlessConnect.shared.cancel()
                connectingKey = nil
            }
            .font(.footnote)
            .tint(Theme.blue)
        }
        .padding(24)
    }

    // MARK: Wallet list

    private var walletList: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField("Search for your wallet", text: $search)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(10)
            .background(Color(hex: 0xF0F2F5))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            if let errorText {
                Text(errorText).font(.footnote).foregroundStyle(.orange)
            }

            if wallets.isEmpty {
                Spacer()
                ProgressView("Loading wallets…").font(.footnote)
                Spacer()
            } else {
                List {
                    ForEach(filtered) { wallet in
                        Button { tap(wallet) } label: { row(wallet) }
                            .disabled(connectingKey != nil)
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    // MARK: Chain picker (multi-chain wallet) — a screen, like the web flow

    @ViewBuilder
    private func chainPicker(_ wallet: HeadlessWallet) -> some View {
        VStack(spacing: 18) {
            HStack {
                Button {
                    chainPickerFor = nil
                } label: {
                    Label("Back", systemImage: "chevron.left").font(.callout)
                }
                .tint(Theme.blue)
                Spacer()
            }

            VStack(spacing: 10) {
                WalletImageView(source: wallet.icon)
                Text("Choose a chain").font(.title3.bold()).foregroundStyle(Theme.ink)
                Text("\(wallet.name) works on more than one chain. Pick where you'd like to connect.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 10) {
                ForEach(wallet.chains, id: \.self) { chain in
                    Button { start(wallet, chain: chain) } label: { chainTile(chain) }
                        .disabled(connectingKey != nil)
                }
            }

            Spacer()
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private func chainTile(_ chain: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(chain == "solana" ? Color(hex: 0x9945FF) : Theme.blue)
                Image(systemName: chain == "solana" ? "bolt.fill" : "diamond.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 34, height: 34)

            VStack(alignment: .leading, spacing: 2) {
                Text(chainLabel(chain)).font(.headline).foregroundStyle(Theme.ink)
                Text(chainSubtitle(chain)).font(.footnote).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color(hex: 0xF9FAFB))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .contentShape(Rectangle())
    }

    // MARK: Rows

    @ViewBuilder
    private func row(_ wallet: HeadlessWallet) -> some View {
        HStack(spacing: 12) {
            WalletImageView(source: wallet.icon)
            Text(wallet.name).font(.headline).foregroundStyle(Theme.ink)
            Spacer()
            if connectingKey == wallet.key {
                ProgressView()
            } else {
                Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    // MARK: Actions

    private func tap(_ wallet: HeadlessWallet) {
        errorText = nil
        if wallet.isMultiChain {
            chainPickerFor = wallet // let the user pick evm vs solana
        } else {
            start(wallet, chain: wallet.chains.first)
        }
    }

    private func start(_ wallet: HeadlessWallet, chain: String?) {
        chainPickerFor = nil
        if wallet.mode == "fallback" {
            openFallback(wallet, chain: chain)
            return
        }
        connectingKey = wallet.key
        FireblocksHeadlessConnect.shared.connect(walletKey: wallet.key, chain: chain) { result in
            connectingKey = nil
            switch result {
            case .success(let connected):
                onConnected(connected)
            case .fallbackRequired:
                openFallback(wallet, chain: chain)
            case .failure(let code, _):
                errorText = "Couldn't connect (\(code))."
            }
        }
    }

    // The visible flow, deep-linked straight to this wallet via `?wallet=` so it
    // opens on that wallet's connect screen rather than the full list.
    private func openFallback(_ wallet: HeadlessWallet, chain: String?) {
        guard var comps = URLComponents(url: flowURL, resolvingAgainstBaseURL: false) else { return }
        var items = comps.queryItems ?? []
        items.append(URLQueryItem(name: "wallet", value: wallet.key))
        if let chain { items.append(URLQueryItem(name: "chain", value: chain)) }
        comps.queryItems = items
        guard let url = comps.url else { return }

        connectingKey = wallet.key
        FireblocksConnectFlow.present(flowURL: url, scheme: scheme) { result in
            connectingKey = nil
            switch result {
            case .success(let connected):
                onConnected(connected)
            case .failure(.cancelled):
                break
            case .failure(let err):
                errorText = "Couldn't connect (\(err))."
            }
        }
    }

    private func chainLabel(_ chain: String) -> String {
        chain == "solana" ? "Solana" : "Ethereum & EVM"
    }

    private func chainSubtitle(_ chain: String) -> String {
        chain == "solana" ? "Solana network" : "Polygon, Base, Arbitrum & more"
    }
}
