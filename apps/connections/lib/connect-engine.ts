import { appendConnectionUriToDeeplink } from "@dynamic-labs-sdk/client";
import { getPreferredWalletDeepLink } from "@dynamic-labs-sdk/wallet-connect";
import { connectWithWalletConnectEvm } from "@dynamic-labs-sdk/evm/wallet-connect";
import { connectWithWalletConnectSolana } from "@dynamic-labs-sdk/solana/wallet-connect";
import { connectWithMetaMaskUriEvm } from "@dynamic-labs-sdk/evm/metamask";
import { connectWithMetaMaskUriSolana } from "@dynamic-labs-sdk/solana/metamask";

import { normalizeChain } from "./redirect";
import type { WalletConnectionOption } from "./wallet-providers";

// The mint + deeplink-assembly core, shared by the visible flow (App.tsx) and
// the headless engine (headless.ts) so the two can never drift. A URI-deeplink
// connection (WalletConnect or MetaMask's SDK URI) is relay-based: we mint a
// pairing URI, the wallet approves out-of-band, and `approval()` resolves over
// a WebSocket - none of which needs a visible page.

export interface WalletAccount {
  address: string;
  chain?: string;
}

export interface MintedConnection {
  uri: string;
  approval: () => Promise<{ walletAccounts: WalletAccount[] }>;
  chain: "evm" | "solana";
}

// Mint a pairing URI for a URI-deeplink connection option. MetaMask's SDK-URI
// option mints through MetaMask's own connector (its native protocol); every
// other WalletConnect-protocol wallet goes through WalletConnect.
export async function mintConnection(
  opt: WalletConnectionOption,
): Promise<MintedConnection> {
  const chain = normalizeChain(opt.chain);
  const mint =
    opt.type === "metamaskSdkUri"
      ? chain === "solana"
        ? connectWithMetaMaskUriSolana
        : connectWithMetaMaskUriEvm
      : chain === "solana"
        ? connectWithWalletConnectSolana
        : connectWithWalletConnectEvm;
  const { uri, approval } = await mint({ addToDynamicWalletAccounts: true });
  return { uri, approval, chain };
}

// Turn a minted URI into a single openable deeplink for the wallet app.
//
// Speed: a universal (https) link round-trips through the wallet's link server
// + iOS universal-link resolution before the app opens - the main cause of a
// slow prompt inside a web view. A native scheme (metamask://, rainbow://)
// opens the app instantly. So when embedded (native web view / hidden webview)
// prefer native; in a normal mobile browser prefer the universal link, which
// returns more reliably. If the minted URI is already a native app deeplink
// (MetaMask's mwp URI is), use it as-is.
export function buildOpenableDeeplink(
  uri: string,
  opt: WalletConnectionOption,
  embedded: boolean,
): string {
  const dl = opt.deeplinks ?? {};
  const uriScheme = (uri.split(":")[0] ?? "").toLowerCase();
  const uriIsNativeApp = !["wc", "http", "https"].includes(uriScheme);
  if (embedded && uriIsNativeApp) return uri;
  const base = embedded
    ? dl.native ?? dl.universal ?? getPreferredWalletDeepLink({ deeplinks: dl })
    : dl.universal ?? dl.native ?? getPreferredWalletDeepLink({ deeplinks: dl });
  return base
    ? appendConnectionUriToDeeplink({ connectionUri: uri, deeplinkUrl: base })
    : uri;
}
